// Every admin request goes through adminFetch. If the server says the session
// has expired (401), the request is not failed: it waits while the admin asks
// for the password again (see ReauthPrompt.jsx), then retries once. Several
// requests that expire at the same time share one prompt, and whatever you were
// saving still gets saved.
let pending = null // { promise, resolve, reject } while the prompt is open
const listeners = new Set()

function notify() {
  listeners.forEach((fn) => fn(!!pending))
}

export function onReauthChange(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

function waitForReauth() {
  if (!pending) {
    let resolve, reject
    const promise = new Promise((res, rej) => {
      resolve = res
      reject = rej
    })
    pending = { promise, resolve, reject }
    notify()
  }
  return pending.promise
}

// Called by the prompt after a successful sign-in.
export function reauthDone() {
  const p = pending
  pending = null
  notify()
  p?.resolve()
}

// Called by the prompt if you choose to log out instead.
export function reauthCancelled() {
  const p = pending
  pending = null
  notify()
  p?.reject(new Error('Signed out. Your last change was not saved.'))
}

export async function adminFetch(url, options) {
  const res = await fetch(url, options)
  if (res.status !== 401) return res
  await waitForReauth()
  return fetch(url, options)
}
