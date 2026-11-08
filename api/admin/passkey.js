import { createHash, timingSafeEqual } from 'node:crypto'
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from '@simplewebauthn/server'
import { isoBase64URL } from '@simplewebauthn/server/helpers'
import {
  appendCookie, challengeCookie, clearChallengeCookie, clearUnlockCookie, readChallenge, requireAuth, sessionCookie, unlockCookie, UNLOCK_MINUTES,
} from '../_lib/auth.js'
import { readPasskeys, relyingParty, writePasskeys } from '../_lib/passkeys.js'

// Fingerprint / face unlock for the admin, using passkeys (WebAuthn). The
// phone checks your fingerprint or face; this endpoint checks the phone's
// signed proof against the public key saved when the device was set up.
//
//   GET  ?step=list              devices set up for unlock
//   POST ?step=register-options  start setting up this device
//   POST ?step=register-verify   finish setting it up
//   POST ?step=remove            remove a device ({ id })
//   POST ?step=unlock-options    start unlocking (works while locked)
//   POST ?step=unlock-verify     finish unlocking (works while locked)
//
// The Android app has its own unlock: the phone keeps a random secret that
// only a live fingerprint can release, and sends it here. Only a hash of the
// secret is saved, in the same list (kind: 'native').
//   POST ?step=native-register   set up the Android app ({ id, secret, label })
//   POST ?step=native-unlock     unlock with the released secret ({ id, secret })
//   POST ?step=lock              lock now (the app calls this after time away)
const USER_ID = new TextEncoder().encode('portfolio-admin')

function body(req) {
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body)
    } catch {
      return {}
    }
  }
  return req.body || {}
}

const publicList = (list) => list.map(({ id, label, createdAt, kind }) => ({ id, label, createdAt, kind: kind === 'native' ? 'native' : 'passkey' }))
const webauthnOnly = (list) => list.filter((p) => p.kind !== 'native')
const hashSecret = (secret) => createHash('sha256').update(String(secret)).digest('hex')
const sameHash = (a, b) => {
  const x = Buffer.from(String(a || ''), 'hex')
  const y = Buffer.from(String(b || ''), 'hex')
  return x.length === 32 && x.length === y.length && timingSafeEqual(x, y)
}
const ID_RE = /^[A-Za-z0-9_-]{16,64}$/
const SECRET_RE = /^[A-Za-z0-9_-]{32,128}$/

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  const step = String(req.query.step || '')
  const unlocking = ['unlock-options', 'unlock-verify', 'native-unlock', 'lock'].includes(step)
  const session = requireAuth(req, res, { allowLocked: unlocking })
  if (!session) return
  const { rpID, origins } = relyingParty(req)

  try {
    if (step === 'list' && req.method === 'GET') {
      const { list } = await readPasskeys()
      return res.status(200).json({ passkeys: publicList(list), lockMinutes: UNLOCK_MINUTES })
    }

    if (req.method !== 'POST') {
      res.setHeader('Allow', 'GET, POST')
      return res.status(405).json({ error: 'Method not allowed' })
    }

    if (step === 'register-options') {
      const { list } = await readPasskeys()
      const options = await generateRegistrationOptions({
        rpName: 'Portfolio Admin',
        rpID,
        userID: USER_ID,
        userName: 'admin',
        userDisplayName: 'Portfolio admin',
        attestationType: 'none',
        excludeCredentials: webauthnOnly(list).map((p) => ({ id: p.id, transports: p.transports })),
        authenticatorSelection: { residentKey: 'preferred', userVerification: 'required' },
      })
      appendCookie(res, challengeCookie(options.challenge, 'register'))
      return res.status(200).json(options)
    }

    if (step === 'register-verify') {
      const { response, label } = body(req)
      const expectedChallenge = readChallenge(req, 'register')
      if (!expectedChallenge) return res.status(400).json({ error: 'Setup took too long. Try again.' })
      const result = await verifyRegistrationResponse({
        response,
        expectedChallenge,
        expectedOrigin: origins,
        expectedRPID: rpID,
        requireUserVerification: true,
      })
      if (!result.verified || !result.registrationInfo) return res.status(400).json({ error: 'This device could not be set up.' })
      const { credential } = result.registrationInfo
      const { list, sha } = await readPasskeys()
      const entry = {
        id: credential.id,
        publicKey: isoBase64URL.fromBuffer(credential.publicKey),
        transports: credential.transports || response?.response?.transports || [],
        label: String(label || 'This device').slice(0, 60),
        createdAt: new Date().toISOString(),
      }
      const next = [...list.filter((p) => p.id !== entry.id), entry]
      await writePasskeys(next, sha, 'admin: add fingerprint unlock device')
      // Lock this session from now on, and count it as unlocked right now.
      appendCookie(res, sessionCookie(true))
      appendCookie(res, unlockCookie())
      appendCookie(res, clearChallengeCookie())
      return res.status(200).json({ passkeys: publicList(next) })
    }

    if (step === 'remove') {
      const { id } = body(req)
      const { list, sha } = await readPasskeys()
      const next = list.filter((p) => p.id !== id)
      if (next.length === list.length) return res.status(404).json({ error: 'That device is not set up.' })
      await writePasskeys(next, sha, 'admin: remove fingerprint unlock device')
      if (!next.length) appendCookie(res, sessionCookie(false)) // nothing left to unlock with
      return res.status(200).json({ passkeys: publicList(next) })
    }

    if (step === 'unlock-options') {
      const list = webauthnOnly((await readPasskeys()).list)
      if (!list.length) return res.status(400).json({ error: 'Fingerprint unlock is not set up in this browser. Use your password.' })
      const options = await generateAuthenticationOptions({
        rpID,
        allowCredentials: list.map((p) => ({ id: p.id, transports: p.transports })),
        userVerification: 'required',
      })
      appendCookie(res, challengeCookie(options.challenge, 'unlock'))
      return res.status(200).json(options)
    }

    if (step === 'unlock-verify') {
      const { response } = body(req)
      const expectedChallenge = readChallenge(req, 'unlock')
      if (!expectedChallenge) return res.status(400).json({ error: 'Unlock took too long. Try again.' })
      const { list } = await readPasskeys()
      const saved = webauthnOnly(list).find((p) => p.id === response?.id)
      if (!saved) return res.status(400).json({ error: 'This device is not set up for unlock. Use your password.' })
      const result = await verifyAuthenticationResponse({
        response,
        expectedChallenge,
        expectedOrigin: origins,
        expectedRPID: rpID,
        requireUserVerification: true,
        credential: {
          id: saved.id,
          publicKey: isoBase64URL.toBuffer(saved.publicKey),
          counter: 0,
          transports: saved.transports,
        },
      })
      if (!result.verified) return res.status(401).json({ error: 'Unlock failed. Try again or use your password.' })
      appendCookie(res, unlockCookie())
      appendCookie(res, clearChallengeCookie())
      return res.status(200).json({ ok: true })
    }

    if (step === 'native-register') {
      const { id, secret, label } = body(req)
      if (!ID_RE.test(String(id || '')) || !SECRET_RE.test(String(secret || ''))) {
        return res.status(400).json({ error: 'This device could not be set up.' })
      }
      const { list, sha } = await readPasskeys()
      const entry = { id, kind: 'native', secretHash: hashSecret(secret), label: String(label || 'Android app').slice(0, 60), createdAt: new Date().toISOString() }
      const next = [...list.filter((p) => p.id !== id), entry]
      await writePasskeys(next, sha, 'admin: add Android app unlock device')
      appendCookie(res, sessionCookie(true))
      appendCookie(res, unlockCookie())
      return res.status(200).json({ passkeys: publicList(next) })
    }

    if (step === 'native-unlock') {
      const { id, secret } = body(req)
      const { list } = await readPasskeys()
      const saved = ID_RE.test(String(id || '')) ? list.find((p) => p.kind === 'native' && p.id === id) : null
      if (!saved || !SECRET_RE.test(String(secret || '')) || !sameHash(saved.secretHash, hashSecret(secret))) {
        return res.status(401).json({ error: 'Unlock failed. Use your password, then turn fingerprint unlock on again.' })
      }
      appendCookie(res, unlockCookie())
      return res.status(200).json({ ok: true })
    }

    if (step === 'lock') {
      appendCookie(res, clearUnlockCookie())
      return res.status(200).json({ ok: true })
    }

    return res.status(400).json({ error: `Unknown step "${step}".` })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
