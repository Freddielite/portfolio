import { requireAuth } from '../_lib/auth.js'
import { getFile, putFile, commitFiles } from '../_lib/github.js'

// Whitelist of editable content files, must match content/*.json exactly.
// `drafts` holds unpublished blog posts. It is never imported by the site, so
// draft text does not ship in the public JavaScript.
const ALLOWED_TYPES = ['projects', 'skills', 'testimonials', 'posts', 'drafts', 'siteSettings']

export default async function handler(req, res) {
  if (!requireAuth(req, res)) return

  // POST ?batch=1  { files: [{ type, data, sha }, ...] }  saves several files in ONE commit,
  // only if every file is still what the caller last saw (409 otherwise). Used when posts and
  // drafts change together (publishing, un-publishing, bulk actions).
  if (req.method === 'POST' && req.query.batch === '1') {
    res.setHeader('Cache-Control', 'no-store, max-age=0')
    try {
      let body = req.body
      if (typeof body === 'string') body = JSON.parse(body)
      const files = Array.isArray(body?.files) ? body.files : []
      const types = files.map((f) => f?.type)
      if (files.length < 2 || files.length > 3 || new Set(types).size !== types.length || !types.every((t) => ALLOWED_TYPES.includes(t))) {
        return res.status(400).json({ error: 'A batch needs two or three different content types.' })
      }
      if (files.some((f) => f.data === undefined || (f.sha != null && typeof f.sha !== 'string'))) {
        return res.status(400).json({ error: 'Each file needs its data and the sha it was loaded with.' })
      }
      const changes = files.map((f) => ({ path: `content/${f.type}.json`, content: JSON.stringify(f.data, null, 2) + '\n', expectSha: f.sha || null }))
      const result = await commitFiles(changes, `admin: update ${types.join(' and ')}`)
      return res.status(200).json({ ok: true, commit: result.commit, shas: Object.fromEntries(types.map((t) => [t, result.shas[`content/${t}.json`]])) })
    } catch (err) {
      return res.status(err.status === 409 ? 409 : 500).json({ error: err.message })
    }
  }

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

  res.setHeader('Allow', 'GET, PUT, POST')
  return res.status(405).json({ error: 'Method not allowed' })
}
