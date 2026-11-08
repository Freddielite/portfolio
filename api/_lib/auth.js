import crypto from 'node:crypto'
import { parseCookies, serializeCookie } from './cookies.js'

const SECRET = process.env.SESSION_SECRET

// Signing in with the password lasts 7 days on a device.
const SESSION_DAYS = 7
const SESSION_SECONDS = SESSION_DAYS * 24 * 60 * 60
// Once fingerprint unlock is set up, a session also has to be unlocked. The
// unlock renews itself on every request while you use the admin and runs out
// after 10 minutes away, then your fingerprint or face (or the password)
// unlocks it again.
const UNLOCK_MINUTES = 10
const UNLOCK_SECONDS = UNLOCK_MINUTES * 60
const CHALLENGE_SECONDS = 5 * 60

const COOKIE_NAME = 'admin_session'
const UNLOCK_COOKIE = 'admin_unlock'
const CHALLENGE_COOKIE = 'admin_challenge'

function sign(payload) {
  return crypto.createHmac('sha256', SECRET).update(payload).digest('base64url')
}

function issue(data) {
  const payload = Buffer.from(JSON.stringify(data)).toString('base64url')
  return `${payload}.${sign(payload)}`
}

// Returns the token's data if the signature is right and it has not expired.
function read(token) {
  if (!token || !SECRET) return null
  const [payload, sig] = String(token).split('.')
  if (!payload || !sig) return null
  const sigBuf = Buffer.from(sig)
  const expectedBuf = Buffer.from(sign(payload))
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) return null
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8'))
    return typeof data.exp === 'number' && Date.now() < data.exp ? data : null
  } catch {
    return null
  }
}

// `lock` is true when fingerprint unlock is set up: the session then also
// needs a current unlock.
export function createToken({ lock = false } = {}) {
  return issue({ kind: 'session', lock: !!lock, exp: Date.now() + SESSION_SECONDS * 1000 })
}

// Sessions signed before this change have no `kind`; they stay valid until
// they expire.
export function readSession(token) {
  const data = read(token)
  return data && (data.kind === 'session' || data.kind === undefined) ? data : null
}

export function verifyToken(token) {
  return !!readSession(token)
}

function createUnlockToken() {
  return issue({ kind: 'unlock', exp: Date.now() + UNLOCK_SECONDS * 1000 })
}

export function createChallengeToken(challenge, purpose) {
  return issue({ kind: 'challenge', c: challenge, p: purpose, exp: Date.now() + CHALLENGE_SECONDS * 1000 })
}

export function readChallenge(req, purpose) {
  const data = read(parseCookies(req.headers.cookie)[CHALLENGE_COOKIE])
  return data && data.kind === 'challenge' && data.p === purpose ? data.c : null
}

// Adds a Set-Cookie header without replacing ones already set.
export function appendCookie(res, cookie) {
  const prev = res.getHeader('Set-Cookie')
  const list = prev ? (Array.isArray(prev) ? prev : [prev]) : []
  res.setHeader('Set-Cookie', [...list, cookie])
}

export const sessionCookie = (lock) => serializeCookie(COOKIE_NAME, createToken({ lock }), { maxAge: SESSION_SECONDS })
export const unlockCookie = () => serializeCookie(UNLOCK_COOKIE, createUnlockToken(), { maxAge: UNLOCK_SECONDS })
export const clearUnlockCookie = () => serializeCookie(UNLOCK_COOKIE, '', { maxAge: 0 })
export const challengeCookie = (challenge, purpose) =>
  serializeCookie(CHALLENGE_COOKIE, createChallengeToken(challenge, purpose), { maxAge: CHALLENGE_SECONDS })
export const clearCookies = () => [COOKIE_NAME, UNLOCK_COOKIE, CHALLENGE_COOKIE].map((n) => serializeCookie(n, '', { maxAge: 0 }))
export const clearChallengeCookie = () => serializeCookie(CHALLENGE_COOKIE, '', { maxAge: 0 })

// Constant-time-ish string compare for the login password check.
export function passwordsMatch(a, b) {
  const aBuf = Buffer.from(String(a ?? ''))
  const bBuf = Buffer.from(String(b ?? ''))
  if (aBuf.length !== bBuf.length) return false
  return crypto.timingSafeEqual(aBuf, bBuf)
}

// Call at the top of any protected API route. Sends a 401 and returns null if
// the request is not signed in, or (with fingerprint unlock on) not unlocked;
// otherwise returns the session. `allowLocked` is only for the unlock steps.
export function requireAuth(req, res, { allowLocked = false } = {}) {
  if (!SECRET) {
    res.status(500).json({ error: 'SESSION_SECRET is not configured on the server.' })
    return null
  }
  const cookies = parseCookies(req.headers.cookie)
  const session = readSession(cookies[COOKIE_NAME])
  if (!session) {
    res.status(401).json({ error: 'Not signed in.' })
    return null
  }
  if (session.lock && !allowLocked) {
    const unlock = read(cookies[UNLOCK_COOKIE])
    if (!unlock || unlock.kind !== 'unlock') {
      res.status(401).json({ error: 'Locked. Unlock with your fingerprint or face, or your password.', locked: true })
      return null
    }
    appendCookie(res, unlockCookie()) // still active: renew the unlock
  }
  return session
}

export { COOKIE_NAME, UNLOCK_COOKIE, SESSION_DAYS, SESSION_SECONDS, UNLOCK_MINUTES }
