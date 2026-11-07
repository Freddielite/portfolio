import { requireAuth } from '../_lib/auth.js'
import { getFile } from '../_lib/github.js'
import { configured, missingEnv, wm, LIST_ID } from '../_lib/wynmail.js'
import { postEmail } from '../_lib/postEmail.js'

const today = () => new Date().toISOString().slice(0, 10)

// POST /api/admin/newsletter  { slug, force? }
// Emails one live blog post to everyone subscribed on the Wynmail list.
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  if (!requireAuth(req, res)) return
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }
  if (!configured()) return res.status(400).json({ error: `Set ${missingEnv().join(', ')} in Vercel first.` })

  const slug = String((req.body || {}).slug || '')
  if (!/^[a-z0-9][a-z0-9-]{0,120}$/.test(slug)) return res.status(400).json({ error: 'Bad post slug.' })
  const force = (req.body || {}).force === true

  try {
    const [postsFile, settingsFile] = await Promise.all([getFile('content/posts.json'), getFile('content/siteSettings.json')])
    const posts = JSON.parse(postsFile.content || '[]')
    const settings = JSON.parse(settingsFile.content || '{}')
    const post = posts.find((p) => p.slug === slug)
    if (!post) return res.status(404).json({ error: 'That post is not published. Only live posts can be emailed.' })
    if (post.status === 'draft' || (post.publishedAt && String(post.publishedAt).slice(0, 10) > today())) {
      return res.status(400).json({ error: 'That post is not live yet, so it cannot be emailed.' })
    }
    const siteUrl = String(settings.siteUrl || '').replace(/\/+$/, '')
    if (!siteUrl) return res.status(400).json({ error: 'Set the Site URL in Settings first, the email links to it.' })

    // The email links to the post, so make sure the live site already has it.
    try {
      const map = await fetch(`${siteUrl}/sitemap.xml`, { cache: 'no-store' })
      if (map.ok && !(await map.text()).includes(`/blog/${slug}`)) {
        return res.status(409).json({ error: 'This post is not on the live site yet. Wait for the deploy to finish, then send.' })
      }
    } catch {
      /* cannot check, carry on */
    }

    const existing = ((await wm('/v1/campaigns')).data || []).find((c) => c.name === `post:${slug}`)
    if (existing && !force) {
      return res.status(409).json({ error: 'This post was already emailed to subscribers.', alreadySent: true, campaignId: existing.id })
    }

    const mail = postEmail({ post, siteUrl, authorName: settings.name })
    const draft = await wm('/v1/campaigns', {
      method: 'POST',
      body: { name: `post:${slug}`, subject: mail.subject, html: mail.html, preview_text: mail.preview, list_id: Number(LIST_ID) },
    })
    const result = await wm(`/v1/campaigns/${draft.id}/send`, { method: 'POST', body: {}, timeout: 25000 })
    if (result.held) {
      return res.status(200).json({ ok: false, held: true, campaignId: draft.id, risk: result.risk, reasons: result.reasons, message: 'Wynmail held this email for review because it may land in spam. Open it in Wynmail to check it and send it.' })
    }
    return res.status(200).json({ ok: true, campaignId: draft.id, queued: result.queued })
  } catch (err) {
    return res.status(err.status && err.status < 600 ? err.status : 502).json({ error: err.message })
  }
}
