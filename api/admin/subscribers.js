import { requireAuth } from '../_lib/auth.js'
import { configured, missingEnv, wm, LIST_ID } from '../_lib/wynmail.js'

const csvCell = (v) => {
  let s = String(v ?? '')
  // A cell that starts with = + - @ can run as a formula in a spreadsheet.
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

// GET /api/admin/subscribers              -> counts, newest signups, posts already emailed
// GET /api/admin/subscribers?export=csv   -> every subscribed contact as a CSV file
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  if (!requireAuth(req, res)) return
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }
  if (!configured()) return res.status(200).json({ configured: false, missing: missingEnv() })

  try {
    if (req.query.export === 'csv') {
      const rows = []
      for (let offset = 0; offset < 20000; offset += 100) {
        const page = await wm(`/v1/lists/${LIST_ID}/contacts?status=subscribed&limit=100&offset=${offset}`)
        rows.push(...page.data)
        if (page.data.length < 100) break
      }
      const lines = [['email', 'first_name', 'last_name', 'joined'].join(',')]
      for (const c of rows) lines.push([c.email, c.first_name, c.last_name, String(c.created_at || '').slice(0, 10)].map(csvCell).join(','))
      res.setHeader('Content-Type', 'text/csv; charset=utf-8')
      res.setHeader('Content-Disposition', 'attachment; filename="subscribers.csv"')
      return res.status(200).send(lines.join('\n'))
    }

    const [stats, recent, campaigns] = await Promise.all([
      wm(`/v1/lists/${LIST_ID}/stats`),
      wm(`/v1/lists/${LIST_ID}/contacts?limit=10`),
      wm('/v1/campaigns'),
    ])
    // Posts emailed to subscribers are Wynmail campaigns named post:<slug>.
    const sent = {}
    for (const c of campaigns.data || []) {
      const m = /^post:(.+)$/.exec(c.name || '')
      if (m && !sent[m[1]]) {
        sent[m[1]] = { id: c.id, status: c.status, sent: c.sent, opened: c.opened, clicked: c.clicked, unsubscribed: c.unsubscribed, at: c.started_at || c.created_at }
      }
    }
    return res.status(200).json({ configured: true, stats, recent: recent.data, sent })
  } catch (err) {
    return res.status(err.status && err.status < 600 ? err.status : 502).json({ error: err.message })
  }
}
