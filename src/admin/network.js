import { useEffect, useRef, useState } from 'react'

// Whether the admin can reach its own server. Every admin request reports in
// (see adminFetch in http.js): a request that cannot get through at all marks
// the admin offline, any answer from the server marks it back online. The
// browser's own online/offline events count too. Pulse or Wynmail being slow
// does not make the admin "offline": those are other servers.
let state = {
  offline: typeof navigator !== 'undefined' && navigator.onLine === false,
  retrying: false,
}
const listeners = new Set()

function update(patch) {
  const next = { ...state, ...patch }
  if (next.offline === state.offline && next.retrying === state.retrying) return
  state = next
  listeners.forEach((fn) => fn(state))
}

export function reportNetwork(ok) {
  update({ offline: !ok, retrying: false })
}

export const isOffline = () => state.offline

export function useNetwork() {
  const [s, setS] = useState(state)
  useEffect(() => {
    listeners.add(setS)
    setS(state)
    return () => listeners.delete(setS)
  }, [])
  return s
}

// Retry: check the connection with one small request, then ask every view
// that failed to load to try again ('admin:retry').
let pinging = null
export function retryNow() {
  if (pinging) return pinging
  update({ retrying: true })
  pinging = fetch('/api/admin/me', { cache: 'no-store' })
    .then(() => {
      reportNetwork(true)
      window.dispatchEvent(new Event('admin:retry'))
      return true
    })
    .catch(() => {
      reportNetwork(false)
      return false
    })
    .finally(() => {
      pinging = null
    })
  return pinging
}

// Runs `fn` whenever Retry brings the connection back.
export function useOnRetry(fn) {
  const ref = useRef(fn)
  ref.current = fn
  useEffect(() => {
    const run = () => ref.current()
    window.addEventListener('admin:retry', run)
    return () => window.removeEventListener('admin:retry', run)
  }, [])
}

if (typeof window !== 'undefined') {
  window.addEventListener('offline', () => update({ offline: true, retrying: false }))
  // The phone says it is back: check for real and reload what failed.
  window.addEventListener('online', () => retryNow())
  // While offline, check quietly every 30 seconds (only while the admin is on screen).
  setInterval(() => {
    if (state.offline && !state.retrying && document.visibilityState === 'visible' && window.location.pathname.startsWith('/admin')) retryNow()
  }, 30000)
}

export const OFFLINE_MESSAGE = 'Could not reach the server. Check your connection, then tap Retry.'
