import { requireAuth } from '../_lib/auth.js'
import { getFileAt, listCommits } from '../_lib/github.js'

const ALLOWED_TYPES = ['projects', 'skills', 'testimonials', 'posts', 'drafts', 'siteSettings']

// GET /api/admin/history?type=posts            -> recent commits for that file
// GET /api/admin/history?type=posts&ref=<sha>  -> the file's data as of that commit
export default async function handler(req, res) {
  if (!requireAuth(req, res)) return
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { type, ref } = req.query
  if (!ALLOWED_TYPES.includes(type)) {
    return res.status(400).json({ error: `Unknown content type "${type}".` })
  }
  const path = `content/${type}.json`

  try {
    if (ref) {
      if (!/^[0-9a-f]{7,40}$/i.test(ref)) return res.status(400).json({ error: 'Bad commit reference.' })
      const content = await getFileAt(path, ref)
      if (content === null) return res.status(404).json({ error: 'That version no longer exists.' })
      return res.status(200).json({ data: JSON.parse(content) })
    }
    const commits = await listCommits(path, 15)
    return res.status(200).json({ commits })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
