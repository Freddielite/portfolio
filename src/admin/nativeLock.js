import { checkSession } from './http.js'
import { getLockAfter, getPrivacy, isNative, isQuiet, onAppState, quietFor, setPrivacy } from './native.js'

// Decides whether coming back to the app should lock it. Kept apart so it can
// be tested without a phone.
export function shouldLock({ awayMs, lockAfter, quiet }) {
  if (quiet) return false
  if (lockAfter === 'now') return awayMs >= 2000 // ignores quick flickers, like pulling down the notification bar
  const minutes = Number(lockAfter)
  return Number.isFinite(minutes) && awayMs >= minutes * 60000
}

let started = false

// Starts watching the Android app. Locking asks the server to forget the
// unlock, then the usual session check raises the lock screen.
export function startNativeLock() {
  if (started || !isNative()) return
  started = true
  setPrivacy(getPrivacy()) // makes the stored choice take effect

  // Opening the file picker backgrounds the app too, so give it time.
  document.addEventListener(
    'click',
    (e) => {
      if (e.target?.matches?.('input[type="file"]')) quietFor(120000)
    },
    true
  )

  let hiddenAt = 0
  onAppState(async (active) => {
    if (!active) {
      hiddenAt = Date.now()
      return
    }
    if (!hiddenAt) return
    const awayMs = Date.now() - hiddenAt
    hiddenAt = 0
    if (!shouldLock({ awayMs, lockAfter: getLockAfter(), quiet: isQuiet() })) return
    try {
      await fetch('/api/admin/passkey?step=lock', { method: 'POST', cache: 'no-store' })
    } catch {
      /* offline: the next request decides */
    }
    checkSession()
  })
}
