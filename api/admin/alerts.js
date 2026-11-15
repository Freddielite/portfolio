import { requireAuth } from '../_lib/auth.js'
import { getFile } from '../_lib/github.js'
import { configured, LIST_ID, wm } from '../_lib/wynmail.js'
import { sendState } from '../_lib/sendState.js'
import { hashToken, newId, newToken, readAlertDevices, readAlertDevicesCached, readBearer, sameHash, writeAlertDevices } from '../_lib/alerts.js'

// Phone alerts for the Android app.
//
// Called by the phone in the background (with its own read-only token):
//   GET  /api/admin/alerts            Authorization: Bearer <id>.<token>
//        -> what the phone compares with its last check: monitors from Pulse,
//           the newest signups and the number of subscribers from Wynmail, emailed posts that
//           are stuck or did not fully go out, and the commit the live site runs.
//   POST /api/admin/alerts?step=forget  (same header) this phone turned alerts off
//
// Called from the admin (signed in):
//   GET  ?step=list        phones with alerts on
//   POST ?step=register    turn alerts on for this phone ({ label }) -> { id, token }
//   POST ?step=remove      turn them off for a phone ({ id })
//
// Pulse or Wynmail being asleep or down never fails the whole answer: that part
// comes back as null with a reason, and the phone keeps what it knew.

const body = (req) => {
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body)
    } catch {
      return {}
    }
  }
  return req.body || {}
}
const ID_RE = /^[A-Za-z0-9_-]{16,64}$/
const publicList = (list) => list.map(({ id, label, createdAt }) => ({ id, label, createdAt }))

async function settings() {
  const { content } = await getFile('content/siteSettings.json')
  try {
    return content ? JSON.parse(content) : {}
  } catch {
    return {}
  }
}

async function pulse(s) {
  const api = String(s.pulseApiUrl || '').replace(/\/+$/, '')
  const token = String(s.pulseStatusToken || '').trim()
  if (!api || !token) return { monitors: null, reason: 'not-set-up' }
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 20000) // Pulse may be waking up
  try {
    const res = await fetch(`${api}/api/public/status-pages/${encodeURIComponent(token)}`, { signal: ctrl.signal, cache: 'no-store' })
    if (!res.ok) return { monitors: null, reason: `pulse-${res.status}` }
    const data = await res.json()
    return {
      monitors: (data.monitors || []).map((m) => ({
        id: String(m.id ?? m.url),
        name: m.name || String(m.url || '').replace(/^https?:\/\//, '').replace(/\/$/, ''),
        status: String(m.current_status || 'unknown'),
      })),
    }
  } catch (err) {
    return { monitors: null, reason: err.name === 'AbortError' ? 'pulse-timeout' : 'pulse-unreachable' }
  } finally {
    clearTimeout(timer)
  }
}

async function signups() {
  if (!configured()) return { signups: null, reason: 'not-set-up' }
  try {
    const [page, stats] = await Promise.all([
      wm(`/v1/lists/${LIST_ID}/contacts?limit=10`, { timeout: 20000 }),
      wm(`/v1/lists/${LIST_ID}/stats`, { timeout: 20000 }).catch(() => null),
    ])
    return {
      signups: (page.data || []).map((c) => ({ email: c.email, name: [c.first_name, c.last_name].filter(Boolean).join(' '), at: c.created_at, status: c.status })),
      subscribersTotal: stats && Number.isFinite(Number(stats.subscribed)) ? Number(stats.subscribed) : null,
    }
  } catch {
    return { signups: null, reason: 'wynmail-unreachable' }
  }
}

// Emailed posts that need a retry: still "sending" after ten minutes, or with emails that failed.
// Titles are looked up only when there is something to say, so a normal check costs nothing extra.
async function stuckSends() {
  if (!configured()) return { sends: null, reason: 'not-set-up' }
  try {
    const campaigns = (await wm('/v1/campaigns', { timeout: 20000 })).data || []
    const seen = new Set()
    const stuck = []
    for (const c of campaigns) {
      const m = /^post:(.+)$/.exec(c.name || '')
      if (!m || seen.has(m[1])) continue // the newest campaign for a post is the one that counts
      seen.add(m[1])
      const at = c.started_at || c.created_at
      const st = sendState({ status: c.status, failed: c.failed, waiting: c.waiting, at })
      if (st.retry) stuck.push({ id: c.id, slug: m[1], kind: st.kind, sent: c.sent || 0, failed: st.failed, waiting: st.waiting, at })
    }
    if (stuck.length) {
      try {
        const { content } = await getFile('content/posts.json')
        const titles = Object.fromEntries((content ? JSON.parse(content) : []).map((p) => [p.slug, p.title]))
        for (const s of stuck) s.title = titles[s.slug] || s.slug
      } catch {
        for (const s of stuck) s.title = s.slug
      }
    }
    return { sends: stuck }
  } catch {
    return { sends: null, reason: 'wynmail-unreachable' }
  }
}

// The commit this deployment was built from: the request reached the live
// site, so this is what the live site runs.
const build = () => ({
  commit: process.env.VERCEL_GIT_COMMIT_SHA || null,
  message: String(process.env.VERCEL_GIT_COMMIT_MESSAGE || '').split('\n')[0].slice(0, 140) || null,
})

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  const step = String(req.query.step || '')
  const bearer = readBearer(req)

  // ---- the phone, with its own token
  if (bearer && (step === '' || step === 'forget')) {
    let devices
    try {
      // 'forget' writes, so it needs the current file; a plain check can use the copy that is a minute old.
      devices = step === 'forget' ? await readAlertDevices() : await readAlertDevicesCached()
    } catch (err) {
      return res.status(502).json({ error: err.message })
    }
    const device = devices.list.find((d) => d.id === bearer.id)
    if (!device || !sameHash(device.hash, hashToken(bearer.token))) {
      return res.status(401).json({ error: 'This phone is not set up for alerts any more.', revoked: true })
    }
    if (step === 'forget') {
      if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
      await writeAlertDevices(devices.list.filter((d) => d.id !== device.id), devices.sha, 'admin: remove alerts device')
      return res.status(200).json({ ok: true })
    }
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
    const s = await settings().catch(() => ({}))
    const [p, w, sn] = await Promise.all([pulse(s), signups(), stuckSends()])
    return res.status(200).json({ at: new Date().toISOString(), ...p, pulseReason: p.reason, ...w, wynmailReason: w.reason, sends: sn.sends, sendsReason: sn.reason, build: build() })
  }

  // ---- the admin, signed in
  if (!requireAuth(req, res)) return
  try {
    if (req.method === 'GET' && step === 'list') {
      const { list } = await readAlertDevices()
      return res.status(200).json({ devices: publicList(list) })
    }
    if (req.method === 'POST' && step === 'register') {
      const label = String(body(req).label || 'Android phone').slice(0, 60)
      const { list, sha } = await readAlertDevices()
      const id = newId()
      const token = newToken()
      const next = [...list, { id, label, hash: hashToken(token), createdAt: new Date().toISOString() }]
      await writeAlertDevices(next, sha, 'admin: add alerts device')
      return res.status(200).json({ id, token, devices: publicList(next) })
    }
    if (req.method === 'POST' && step === 'remove') {
      const id = String(body(req).id || '')
      if (!ID_RE.test(id)) return res.status(400).json({ error: 'Unknown phone.' })
      const { list, sha } = await readAlertDevices()
      const next = list.filter((d) => d.id !== id)
      if (next.length !== list.length) await writeAlertDevices(next, sha, 'admin: remove alerts device')
      return res.status(200).json({ devices: publicList(next) })
    }
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
  return res.status(400).json({ error: 'Unknown step.' })
}
