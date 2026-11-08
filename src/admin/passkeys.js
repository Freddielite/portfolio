import { browserSupportsWebAuthn, startAuthentication, startRegistration } from '@simplewebauthn/browser'
import { adminFetch } from './http.js'

// Fingerprint / face unlock (passkeys). See api/admin/passkey.js.
export const supportsPasskeys = () => typeof window !== 'undefined' && browserSupportsWebAuthn()

async function call(step, { body, method = 'POST', locked = false } = {}) {
  // The unlock steps must not wait for an unlock themselves.
  const f = locked ? fetch : adminFetch
  const res = await f(`/api/admin/passkey?step=${step}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Something went wrong. Try again.')
  return data
}

// Turns the browser's own error messages into plain ones.
function friendly(err, action) {
  const name = err?.name || err?.cause?.name
  if (name === 'NotAllowedError' || name === 'AbortError') {
    // The browser reports a cancelled prompt and an unrecognised finger the same way.
    return new Error(action === 'unlock' ? 'Not unlocked. Try again, or use your password.' : 'Setup did not finish. Try again when you are ready.')
  }
  if (name === 'InvalidStateError') return new Error('This device is already set up.')
  if (name === 'SecurityError') return new Error('Fingerprint unlock only works on your real site address, not on preview links.')
  return err instanceof Error ? err : new Error(String(err))
}

export const listPasskeys = () => call('list', { method: 'GET' })
export const removePasskey = (id) => call('remove', { body: { id } })
export const registerNativeOnServer = (body) => call('native-register', { body: { ...body, label: 'Android app' } })
export const unlockNativeOnServer = (body) => call('native-unlock', { body, locked: true })

export async function addPasskey(label) {
  const options = await call('register-options')
  let response
  try {
    response = await startRegistration({ optionsJSON: options })
  } catch (err) {
    throw friendly(err, 'setup')
  }
  return call('register-verify', { body: { response, label } })
}

export async function unlockWithPasskey() {
  const options = await call('unlock-options', { locked: true })
  let response
  try {
    response = await startAuthentication({ optionsJSON: options })
  } catch (err) {
    throw friendly(err, 'unlock')
  }
  return call('unlock-verify', { body: { response }, locked: true })
}

// A readable name for the device being set up, like "Android phone".
export function deviceLabel() {
  const ua = navigator.userAgent
  const kind = /iPhone/.test(ua) ? 'iPhone' : /iPad/.test(ua) ? 'iPad' : /Android/.test(ua) ? (/Mobile/.test(ua) ? 'Android phone' : 'Android tablet')
    : /Mac/.test(ua) ? 'Mac' : /Windows/.test(ua) ? 'Windows PC' : /Linux/.test(ua) ? 'Linux computer' : 'This device'
  return kind
}
