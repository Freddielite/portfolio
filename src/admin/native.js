import { Capacitor, registerPlugin } from '@capacitor/core'

// The Android app (Capacitor) opens the live admin inside a native shell. This
// file is the only place that talks to the phone: fingerprint, the privacy
// screen and saving files. In a normal browser every function here is skipped.
//
// Plugins are called by name, so no plugin code is bundled into the website.
const Biometric = registerPlugin('NativeBiometric')
const AppState = registerPlugin('App')
const Privacy = registerPlugin('PrivacyScreen')
const Files = registerPlugin('Filesystem')
const Share = registerPlugin('Share')
const InAppBrowser = registerPlugin('Browser')
const Haptics = registerPlugin('Haptics')
const SystemBars = registerPlugin('SystemBars')
const AdminBridge = registerPlugin('AdminBridge') // our own: shortcuts and shared content (AdminBridge.java)

export const isNative = () => {
  try {
    return Capacitor.isNativePlatform()
  } catch {
    return false
  }
}

const SERVER = 'xyz.wyntek.admin' // the name the secret is stored under on the phone
const BIOMETRY_CURRENT_SET = 1 // key is lost if a new fingerprint is added to the phone
const DEVICE_KEY = 'admin:device-id'
const LOCK_KEY = 'admin:lock-after'
const PRIVACY_KEY = 'admin:privacy'

const read = (k) => {
  try {
    return localStorage.getItem(k)
  } catch {
    return null
  }
}
const write = (k, v) => {
  try {
    localStorage.setItem(k, v)
  } catch {
    /* storage blocked: the default stays */
  }
}

const randomId = (bytes) => {
  const b = new Uint8Array(bytes)
  crypto.getRandomValues(b)
  return btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

// While the phone shows its own screen (fingerprint prompt, file picker, share
// sheet) the app goes to the background for a moment. That must not lock it.
let quietUntil = 0
export const quietFor = (ms) => {
  quietUntil = Math.max(quietUntil, Date.now() + ms)
}
export const isQuiet = () => Date.now() < quietUntil
// The Android shell calls this when it opens your live site in the in-app browser.
if (typeof window !== 'undefined') window.__adminQuietFor = quietFor

async function quiet(ms, fn) {
  quietFor(ms)
  try {
    return await fn()
  } finally {
    quietFor(4000)
  }
}

// ---------- fingerprint ----------
export async function biometricStatus() {
  if (!isNative()) return { available: false }
  try {
    const r = await Biometric.isAvailable({ useFallback: false })
    return { available: !!r.isAvailable, deviceIsSecure: !!r.deviceIsSecure }
  } catch {
    return { available: false }
  }
}

export async function nativeIsSetUp() {
  if (!isNative() || !read(DEVICE_KEY)) return false
  try {
    return !!(await Biometric.isCredentialsSaved({ server: SERVER })).isSaved
  } catch {
    return false
  }
}

const cancelled = (err) => /cancel|user_cancel|negative|dismiss|app_cancel|code[:= ]*(10|11|13)\b/i.test(`${err?.code || ''} ${err?.message || ''}`)

// Keeps a random secret on the phone that only a live fingerprint can read
// back, then tells the server a hash of it. `register` is the server call.
export async function setUpNative(register) {
  const id = read(DEVICE_KEY) || randomId(18)
  const secret = randomId(48)
  try {
    await quiet(60000, () =>
      Biometric.setCredentials({
        username: id,
        password: secret,
        server: SERVER,
        accessControl: BIOMETRY_CURRENT_SET,
        title: 'Turn on fingerprint unlock',
        negativeButtonText: 'Cancel',
        maxAttempts: 3,
      })
    )
  } catch (err) {
    throw new Error(cancelled(err) ? 'Setup did not finish. Try again when you are ready.' : 'Could not use the fingerprint on this phone. Check that a fingerprint is saved in the phone settings.')
  }
  try {
    const result = await register({ id, secret })
    write(DEVICE_KEY, id)
    return result
  } catch (err) {
    await Biometric.deleteCredentials({ server: SERVER }).catch(() => {})
    throw err
  }
}

// Releases the secret with a live fingerprint and hands it to `send`.
export async function unlockNative(send) {
  let creds
  try {
    creds = await quiet(60000, () =>
      Biometric.getSecureCredentials({
        server: SERVER,
        title: 'Unlock admin',
        subtitle: 'Confirm it is you',
        negativeButtonText: 'Use password',
        maxAttempts: 3,
      })
    )
  } catch (err) {
    if (cancelled(err)) throw new Error('Not unlocked. Try again, or use your password.')
    throw new Error('Fingerprint unlock could not be used. If the fingerprints on your phone changed, use your password, then turn it on again in Security.')
  }
  return send({ id: creds.username, secret: creds.password })
}

export const thisDeviceId = () => read(DEVICE_KEY)

export async function forgetNative() {
  try {
    await Biometric.deleteCredentials({ server: SERVER })
  } catch {
    /* nothing was saved */
  }
  try {
    localStorage.removeItem(DEVICE_KEY)
  } catch {
    /* ignore */
  }
}

// ---------- settings kept on this phone ----------
export const LOCK_CHOICES = [
  { value: 'now', label: 'Right away' },
  { value: '1', label: 'After 1 minute' },
  { value: '5', label: 'After 5 minutes' },
  { value: '10', label: 'After 10 minutes' },
]
export const getLockAfter = () => (LOCK_CHOICES.some((c) => c.value === read(LOCK_KEY)) ? read(LOCK_KEY) : '10')
export const setLockAfter = (v) => write(LOCK_KEY, v)

export const getPrivacy = () => read(PRIVACY_KEY) !== '0'
export async function setPrivacy(on) {
  write(PRIVACY_KEY, on ? '1' : '0')
  if (!isNative()) return
  try {
    await (on ? Privacy.enable() : Privacy.disable())
  } catch {
    /* plugin missing: nothing to switch */
  }
}

// ---------- app in the foreground or background ----------
export async function onAppState(fn) {
  if (!isNative()) return () => {}
  const handle = await AppState.addListener('appStateChange', (s) => fn(!!s.isActive))
  return () => handle.remove()
}

// ---------- saving files ----------
// A browser saves the file straight away. The Android app cannot do that from a
// page, so it opens the phone's share sheet (Save to Drive, Files, WhatsApp...).
export async function saveFile(filename, blob) {
  if (!isNative()) {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = filename
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
    return 'saved'
  }
  const data = await new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result).split(',')[1])
    r.onerror = () => reject(new Error('Could not read the file.'))
    r.readAsDataURL(blob)
  })
  await Files.writeFile({ path: filename, data, directory: 'CACHE', recursive: true })
  const { uri } = await Files.getUri({ path: filename, directory: 'CACHE' })
  await quiet(120000, () => Share.share({ title: filename, dialogTitle: 'Save or send', url: uri }))
  return 'shared'
}

// ---------- opening your live site ----------
// In the Android app a plain link would replace the admin with your site, full
// screen, with no way back. Here it opens in the phone's in-app browser instead,
// which has an X at the top and a normal browser look. In a normal browser this
// returns false and the link opens in a new tab as usual.
export async function openInApp(url) {
  if (!isNative()) return false
  try {
    quietFor(5 * 60 * 1000) // looking at your own site must not lock the admin when you come back
    await InAppBrowser.open({ url: new URL(url, window.location.origin).href })
    return true
  } catch {
    return false
  }
}

// ---------- extra fingerprint check for things that cannot be undone ----------
// Asks for the fingerprint once more before emailing subscribers, restoring a
// backup or removing a device. If fingerprint unlock was never turned on there is
// nothing to check against, so it lets the action through (the dialog still asked).
export async function confirmIdentity(reason = 'Confirm it is you') {
  if (!(await nativeIsSetUp())) return true
  try {
    await quiet(60000, () =>
      Biometric.verifyIdentity({
        reason,
        title: 'Confirm it is you',
        subtitle: reason,
        negativeButtonText: 'Cancel',
        maxAttempts: 3,
      })
    )
    return true
  } catch {
    return false
  }
}

// ---------- small vibrations ----------
// A light tap for picking something up, a firmer one for a destructive confirm, and
// a double pulse for saved or failed. Silent in a normal browser, and never throws.
const buzz = (fn) => {
  if (!isNative()) return
  Promise.resolve()
    .then(fn)
    .catch(() => {})
}
export const haptic = {
  tap: () => buzz(() => Haptics.impact({ style: 'LIGHT' })),
  warn: () => buzz(() => Haptics.impact({ style: 'MEDIUM' })),
  success: () => buzz(() => Haptics.notification({ type: 'SUCCESS' })),
  error: () => buzz(() => Haptics.notification({ type: 'ERROR' })),
}

// ---------- status bar and navigation bar ----------
// The page draws behind the system bars. Their icons must stay readable on the
// admin's colours, so they follow the theme the page is actually showing.
function pageIsDark() {
  const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(getComputedStyle(document.body).backgroundColor || '')
  if (!m) return window.matchMedia('(prefers-color-scheme: dark)').matches
  const [r, g, b] = [m[1], m[2], m[3]].map(Number)
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.5
}

export function followTheme() {
  if (!isNative()) return () => {}
  const apply = () => {
    // 'DARK' means a dark page, so the bar icons turn light.
    Promise.resolve()
      .then(() => SystemBars.setStyle({ style: pageIsDark() ? 'DARK' : 'LIGHT' }))
      .catch(() => {})
  }
  apply()
  const watch = new MutationObserver(apply)
  watch.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] })
  const mq = window.matchMedia('(prefers-color-scheme: dark)')
  mq.addEventListener('change', apply)
  return () => {
    watch.disconnect()
    mq.removeEventListener('change', apply)
  }
}

// ---------- shortcuts and shared content from the phone ----------
// Calls `handler` with { kind: 'shortcut', dest } or { kind: 'share', title, text,
// images: [{ name, type, data }] } (photos as base64). Returns a function that stops
// listening. Something that arrived before this was called is delivered right away.
export async function listenForPhoneIntents(handler) {
  if (!isNative()) return () => {}
  try {
    const sub = await AdminBridge.addListener('adminIntent', handler)
    return () => sub.remove()
  } catch {
    return () => {}
  }
}
