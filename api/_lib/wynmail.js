// Server-side client for the Wynmail API. The key never reaches the browser:
// the public signup form talks to Wynmail's open form endpoint, and everything
// that needs the key (stats, subscriber list, sending a post) goes through the
// admin-only functions that import this file.

const BASE = String(process.env.WYNMAIL_API_URL || '').replace(/\/+$/, '')
const KEY = process.env.WYNMAIL_API_KEY || ''
export const LIST_ID = String(process.env.WYNMAIL_LIST_ID || '').trim()

export const configured = () => !!(BASE && KEY && /^\d+$/.test(LIST_ID))

export function missingEnv() {
  const missing = []
  if (!BASE) missing.push('WYNMAIL_API_URL')
  if (!KEY) missing.push('WYNMAIL_API_KEY')
  if (!/^\d+$/.test(LIST_ID)) missing.push('WYNMAIL_LIST_ID')
  return missing
}

// Wynmail on a free host can be asleep; give it a fair wait, then say so plainly.
export async function wm(path, { method = 'GET', body, timeout = 9000 } = {}) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeout)
  try {
    const res = await fetch(BASE + path, {
      method,
      headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
      signal: ctrl.signal,
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      const err = new Error(data.error || `Wynmail answered ${res.status}.`)
      err.status = res.status
      throw err
    }
    return data
  } catch (err) {
    if (err.name === 'AbortError') {
      const e = new Error('Wynmail took too long to answer. If it was asleep, try again in a minute.')
      e.status = 504
      throw e
    }
    throw err
  } finally {
    clearTimeout(timer)
  }
}
