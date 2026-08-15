import { requireAuth } from '../_lib/auth.js'
import { putFile } from '../_lib/github.js'

// Vercel's default body parser limit is 4mb — bump it a bit for image
// uploads (photos still shouldn't be sent much bigger than this anyway).
export const config = {
  api: {
    bodyParser: { sizeLimit: '8mb' },
  },
}

function safeFilename(name) {
  const cleaned = name.replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-')
  return `${Date.now()}-${cleaned}`
}

export default async function handler(req, res) {
  if (!requireAuth(req, res)) return
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  let body = req.body
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body)
    } catch {
      body = {}
    }
  }

  const { filename, dataUrl, folder } = body || {}
  const safeFolder = ['projects', 'blog', 'profile'].includes(folder) ? folder : 'uploads'

  if (!filename || !dataUrl) {
    return res.status(400).json({ error: 'filename and dataUrl are required.' })
  }
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl)
  if (!match) return res.status(400).json({ error: 'dataUrl must be a base64 data URL.' })
  const base64 = match[2]

  const finalName = safeFilename(filename)
  const repoPath = `public/images/${safeFolder}/${finalName}`

  try {
    await putFile(repoPath, base64, undefined, `admin: upload image ${finalName}`, { isBase64: true })
    return res.status(200).json({ path: `/images/${safeFolder}/${finalName}` })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
