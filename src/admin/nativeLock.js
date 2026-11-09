import { waitForReauth } from './http.js'
import {
  appLockConfigure, appLockPending, appLockShown, appLockSupported, endQuiet, getLockAfter, getPrivacy, isNative, isQuiet,
  nativeIsSetUp, onAppLock, onAppState, quietFor, setPrivacy, thisDeviceId,
} from './native.js'

// The Android app's lock, like WhatsApp's: with fingerprint unlock set up on
// this phone, leaving the app and coming back asks for the fingerprint again,
// right away or after the time chosen in Security ("Lock the app").
//
// It is decided on the phone, so the lock screen shows at once, also with no
// connection. The server is told in the background (it forgets the unlock),
// so the admin's data stays locked there too until the fingerprint is given.
//
// Two ways back into the app are covered:
//  - from the background (another app, the home screen, the phone locked), and
//  - a fresh start (the app was swiped away, or Android closed it).
//
// From APK 1.2 the app itself decides (AppLock.java): Android always runs its
// code when the app leaves and comes back, while this page may be paused at
// exactly those moments. The app covers the window natively and asks this page
// for the lock screen; this page tells it the settings and confirms once the
// lock screen is up. With an older APK this page decides, as before.

const LAST_SEEN = 'admin:last-seen' // when the app was last on screen, for a fresh start

// Whether coming back after `awayMs` should lock. Kept apart so it can be
// tested without a phone. Android only reports the app as gone once it is
// fully out of sight, so "Right away" means any time at all.
export function shouldLock({ awayMs, lockAfter, quiet }) {
  if (quiet) return false
  if (lockAfter === 'now') return awayMs >= 0
  const minutes = Number(lockAfter)
  return Number.isFinite(minutes) && awayMs >= minutes * 60000
}

// A fresh start: with "Right away" it always locks; otherwise it counts the
// time since the app was last on screen (no record counts as long ago).
export function shouldLockAtLaunch({ lastSeen, now, lockAfter }) {
  if (lockAfter === 'now') return true
  return shouldLock({ awayMs: lastSeen ? now - lastSeen : Infinity, lockAfter, quiet: false })
}

function noteSeen() {
  try {
    localStorage.setItem(LAST_SEEN, String(Date.now()))
  } catch {
    /* storage blocked: a fresh start then always locks */
  }
}

function lastSeen() {
  try {
    return Number(localStorage.getItem(LAST_SEEN)) || 0
  } catch {
    return 0
  }
}

// Is the lock on for this phone? Only when fingerprint unlock was set up here:
// without it there is nothing to unlock with but the password.
export async function lockIsOn() {
  if (!isNative() || !thisDeviceId()) return false
  return nativeIsSetUp()
}

// Tells the server to forget the unlock. Not waited for: the lock screen is
// already up, and with no connection the phone's lock still holds.
function lockServer() {
  fetch('/api/admin/passkey?step=lock', { method: 'POST', cache: 'no-store' }).catch(() => {})
}

// ---- A cover over the admin while it is away, so coming back never shows
// even one frame of it before the lock screen.
function cover() {
  if (document.querySelector('.admin-lock-cover')) return
  const el = document.createElement('div')
  el.className = 'admin-lock-cover'
  el.setAttribute('aria-hidden', 'true')
  ;(document.querySelector('.admin-page') || document.body).appendChild(el)
}
function uncover() {
  document.querySelectorAll('.admin-lock-cover').forEach((el) => el.remove())
}

// Shows the lock screen now (through the same prompt a locked request raises).
// Whatever was waiting to be saved is sent once the fingerprint is given.
// The cover sits just under the lock screen, so it can come off a moment later.
function lockNow() {
  lockServer()
  waitForReauth('locked').catch(() => {})
  setTimeout(uncover, 400)
}

// Tells the app the lock settings (APK 1.2+). Called on start and whenever
// fingerprint unlock or "Lock the app" changes.
export async function syncAppLock() {
  if (!(await appLockSupported())) return
  const enabled = await lockIsOn()
  const after = getLockAfter()
  appLockConfigure({ enabled, lockAfterMs: after === 'now' ? 0 : Number(after) * 60000, background: pageBackground() })
}

// The admin's background as #rrggbb, for the app's cover.
function pageBackground() {
  const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(getComputedStyle(document.body).backgroundColor || '')
  if (!m) return '#0b1020'
  return '#' + [m[1], m[2], m[3]].map((n) => Number(n).toString(16).padStart(2, '0')).join('')
}

// Tells the app its lock screen is up (or nothing needed locking), so its
// cover can come off. Waits two frames so the lock screen is really drawn.
export function confirmLockShown() {
  requestAnimationFrame(() => requestAnimationFrame(() => appLockShown()))
}

// A fresh start (Admin.jsx asks before anything else is shown).
export async function lockAtLaunch() {
  if (await appLockSupported()) return appLockPending() // the app has decided already
  if (!(await lockIsOn())) return false
  const lock = shouldLockAtLaunch({ lastSeen: lastSeen(), now: Date.now(), lockAfter: getLockAfter() })
  if (lock) lockServer()
  return lock
}

let started = false

// Watches the app going to the background and coming back. Called once the
// dashboard is open.
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

  // APK 1.2+: the app decides; this page shows the lock screen when asked.
  appLockSupported().then((native) => {
    if (!native) return startPageLock()
    syncAppLock()
    // The app's cover uses the admin's background: keep it in step with the theme.
    new MutationObserver(() => syncAppLock()).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => syncAppLock())
    onAppLock(() => {
      lockNow()
      confirmLockShown()
    })
  })
}

// Older APK: this page watches the app leaving and coming back itself.
function startPageLock() {
  // Remember when the app was last on screen, for a fresh start after Android
  // closes it in the background.
  noteSeen()
  setInterval(() => document.visibilityState === 'visible' && noteSeen(), 15000)

  let on = false
  lockIsOn().then((v) => (on = v))
  let hiddenAt = 0

  onAppState(async (active) => {
    if (!active) {
      hiddenAt = Date.now()
      noteSeen()
      // Set up while it is out of sight, so the way back opens on a blank
      // screen instead of the admin. Not during the file picker and the like.
      on = await lockIsOn()
      if (on && getLockAfter() === 'now' && !isQuiet()) cover()
      return
    }
    noteSeen()
    if (!hiddenAt) return
    const awayMs = Date.now() - hiddenAt
    hiddenAt = 0
    const quiet = isQuiet()
    endQuiet()
    if (on && shouldLock({ awayMs, lockAfter: getLockAfter(), quiet })) {
      cover()
      lockNow()
    } else {
      uncover()
    }
  })
}
