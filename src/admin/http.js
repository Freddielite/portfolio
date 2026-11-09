// Every admin request goes through adminFetch. When the server turns a request
// away it is not failed: it waits while the admin asks you to get back in,
// then retries once. There are two reasons:
//   'locked'  fingerprint unlock is on and you were away too long: your
//             fingerprint or face (or the password) unlocks it again
//   'expired' the 7-day sign-in ran out: the password is needed
// Requests turned away at the same time share one prompt, and whatever you
// were saving still gets saved.
import { OFFLINE_MESSAGE, reportNetwork } from './network.js'

let pending = null // { promise, resolve, reject, reason }
const listeners = new Set()

function notify() {
  listeners.forEach((fn) => fn(pending ? pending.reason : null))
}

export function onReauthChange(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function waitForReauth(reason = 'expired') {
  if (!pending) {
    let resolve, reject
    const promise = new Promise((res, rej) => {
      resolve = res
      reject = rej
    })
    pending = { promise, resolve, reject, reason }
    notify()
  } else if (reason === 'expired' && pending.reason !== 'expired') {
    // A full sign-in also covers the unlock, so ask for that instead.
    pending.reason = 'expired'
    notify()
  }
  return pending.promise
}

export function reauthDone() {
  const p = pending
  pending = null
  notify()
  p?.resolve()
}

export function reauthCancelled() {
  const p = pending
  pending = null
  notify()
  p?.reject(new Error('Signed out. Your last change was not saved.'))
}

async function reasonOf(res) {
  const body = await res.clone().json().catch(() => ({}))
  return body.locked ? 'locked' : 'expired'
}

// A request that cannot reach the server at all (no connection, server
// unreachable) marks the admin offline and fails with a plain message; any
// answer marks it online again. A cancelled request (AbortError) is passed on.
async function send(url, options) {
  try {
    const res = await fetch(url, options)
    reportNetwork(true)
    return res
  } catch (err) {
    if (err?.name === 'AbortError') throw err
    reportNetwork(false)
    throw new Error(OFFLINE_MESSAGE)
  }
}

export async function adminFetch(url, options) {
  const res = await send(url, options)
  if (res.status !== 401) return res
  await waitForReauth(await reasonOf(res))
  return send(url, options)
}

// Asks the server whether this browser is still signed in and unlocked, and
// raises the prompt if not. Used when the app comes back to the foreground.
export async function checkSession() {
  try {
    const res = await fetch('/api/admin/me', { cache: 'no-store' })
    reportNetwork(true)
    if (res.status === 401) waitForReauth(await reasonOf(res)).catch(() => {})
  } catch {
    reportNetwork(false) // offline: the banner says so, and the next request will tell
  }
}
