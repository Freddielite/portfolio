// Last-known data, kept on this device so the admin can show it the moment it
// opens and refresh it behind the scenes (Overview, Site health, Subscribers,
// Recent activity). Only read-only views use it: the editors always load the
// latest version before you can change anything, so an old copy can never be
// saved over newer content.
//
// Who can see it: the dashboard only renders after the server says you are
// signed in (and unlocked, when fingerprint unlock is on). The one exception is
// opening straight from the cache before that answer arrives, which is only
// allowed when fingerprint unlock is off (see canOpenFromCache). Logging out,
// or the sign-in running out, wipes everything here.
const PREFIX = 'admin:cache:'
const META = 'admin:cache-meta'
const MAX_AGE = 7 * 24 * 60 * 60 * 1000 // the length of a password sign-in

function get(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || 'null')
  } catch {
    return null
  }
}

function set(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false // storage full or blocked: the admin simply loads as before
  }
}

// { value, at } or null when missing or older than a sign-in can last.
export function readCache(key) {
  const entry = get(PREFIX + key)
  if (!entry || typeof entry.at !== 'number' || Date.now() - entry.at > MAX_AGE) return null
  return entry
}

export function writeCache(key, value) {
  if (!set(PREFIX + key, { at: Date.now(), value })) {
    // Probably full: drop the other cached views and try once more.
    clearCache({ keepMeta: true })
    set(PREFIX + key, { at: Date.now(), value })
  }
}

export function clearCache({ keepMeta = false } = {}) {
  try {
    const keys = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && k.startsWith(PREFIX)) keys.push(k)
    }
    keys.forEach((k) => localStorage.removeItem(k))
    if (!keepMeta) localStorage.removeItem(META)
  } catch {
    /* nothing stored */
  }
}

// Called whenever the server confirms the session, with whether it needs an
// unlock (fingerprint unlock on).
export function rememberSession({ lock }) {
  set(META, { lock: !!lock, at: Date.now() })
}

// Open the dashboard from the cache before the server has answered? Only when
// fingerprint unlock was off at the last check and there is something to show.
export function canOpenFromCache() {
  const meta = get(META)
  return !!(meta && meta.lock === false && Date.now() - meta.at < MAX_AGE && readCache('overview'))
}

// "5 minutes ago" style, for the "Updated …" notes.
export function agoText(at, now = Date.now()) {
  if (!at) return ''
  const s = Math.max(0, Math.round((now - at) / 1000))
  if (s < 45) return 'just now'
  const m = Math.round(s / 60)
  if (m < 60) return m === 1 ? 'a minute ago' : `${m} minutes ago`
  const h = Math.round(m / 60)
  if (h < 24) return h === 1 ? 'an hour ago' : `${h} hours ago`
  const d = Math.round(h / 24)
  return d === 1 ? 'yesterday' : `${d} days ago`
}
