import { getFile } from './github.js'
import { configured, LIST_ID, wm } from './wynmail.js'
import { sendState } from './sendState.js'

// Live checks for the Diagnostics screen. Each one answers with a plain object and
// never throws: a service being down is the answer, not an error.

const took = (t0) => Date.now() - t0

export async function readSettings() {
  try {
    const { content } = await getFile('content/siteSettings.json')
    return content ? JSON.parse(content) : {}
  } catch {
    return {}
  }
}

export async function checkPulse(settings) {
  const api = String(settings.pulseApiUrl || '').replace(/\/+$/, '')
  const token = String(settings.pulseStatusToken || '').trim()
  if (!api || !token) return { state: 'off', message: 'Not set up in Site settings.' }
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 20000) // Pulse may be waking up
  const t0 = Date.now()
  try {
    const res = await fetch(`${api}/api/public/status-pages/${encodeURIComponent(token)}`, { signal: ctrl.signal, cache: 'no-store' })
    if (!res.ok) return { state: 'bad', ms: took(t0), message: `Pulse answered ${res.status}. Check the API URL and token.` }
    const data = await res.json()
    const monitors = data.monitors || []
    const down = monitors.filter((m) => String(m.current_status) === 'down').map((m) => m.name || m.url)
    return { state: 'ok', ms: took(t0), monitors: monitors.length, up: monitors.filter((m) => m.current_status === 'up').length, down }
  } catch (err) {
    return { state: 'bad', ms: took(t0), message: err.name === 'AbortError' ? 'Pulse did not answer in 20 seconds (it may be asleep).' : 'Could not reach Pulse.' }
  } finally {
    clearTimeout(timer)
  }
}

export async function checkWynmail() {
  if (!configured()) return { state: 'off', message: 'Not set up (WYNMAIL_* variables in Vercel).' }
  const t0 = Date.now()
  try {
    const [stats, campaigns] = await Promise.all([
      wm(`/v1/lists/${LIST_ID}/stats`, { timeout: 20000 }),
      wm('/v1/campaigns', { timeout: 20000 }),
    ])
    const ms = took(t0)
    const seen = new Set()
    const stuck = []
    for (const c of campaigns.data || []) {
      const m = /^post:(.+)$/.exec(c.name || '')
      if (!m || seen.has(m[1])) continue // the newest campaign for a post is the one that counts
      seen.add(m[1])
      const st = sendState({ status: c.status, failed: c.failed, waiting: c.waiting, at: c.started_at || c.created_at })
      if (st.retry) stuck.push({ slug: m[1], kind: st.kind, failed: st.failed, waiting: st.waiting })
    }
    return {
      state: stuck.length ? 'warn' : 'ok',
      ms,
      subscribers: Number.isFinite(Number(stats?.subscribed)) ? Number(stats.subscribed) : null,
      stuck,
    }
  } catch (err) {
    return { state: 'bad', ms: took(t0), message: err.message || 'Could not reach Wynmail.' }
  }
}
