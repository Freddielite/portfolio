import { requireAuth } from '../_lib/auth.js'
import { getFile, putFile } from '../_lib/github.js'

// Whitelist of editable content files, must match content/*.json exactly.
// `drafts` holds unpublished blog posts. It is never imported by the site, so
// draft text does not ship in the public JavaScript.
const ALLOWED_TYPES = ['projects', 'skills', 'testimonials', 'posts', 'drafts', 'siteSettings']

export default async function handler(req, res) {
  if (!requireAuth(req, res)) return

  const { type } = req.query
  if (!ALLOWED_TYPES.includes(type)) {
    return res.status(400).json({ error: `Unknown content type "${type}".` })
  }
  const path = `content/${type}.json`
  // Admin content must always be fresh: never let a browser or CDN keep a copy.
  res.setHeader('Cache-Control', 'no-store, max-age=0')

  if (req.method === 'GET') {
    try {
      const { content, sha } = await getFile(path)
      if (content === null) return res.status(404).json({ error: `${path} not found in repo.`, notFound: true })
      return res.status(200).json({ data: JSON.parse(content), sha })
    } catch (err) {
      return res.status(500).json({ error: err.message })
    }
  }

  if (req.method === 'PUT') {
    try {
      let body = req.body
      if (typeof body === 'string') body = JSON.parse(body)
      const { data, sha } = body || {}
      if (data === undefined) return res.status(400).json({ error: 'Missing "data" in request body.' })

      const json = JSON.stringify(data, null, 2) + '\n'
      const result = await putFile(path, json, sha, `admin: update ${type}`)
      return res.status(200).json({ ok: true, sha: result.content?.sha, commit: result.commit?.sha })
    } catch (err) {
      return res.status(500).json({ error: err.message })
    }
  }

  res.setHeader('Allow', 'GET, PUT')
  return res.status(405).json({ error: 'Method not allowed' })
}
