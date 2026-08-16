import { requireAuth } from '../_lib/auth.js'
import { getFile, putFile } from '../_lib/github.js'

// Vercel's default body parser limit is 4mb — bump it a bit for image
// (and CV/resume) uploads, which still shouldn't be sent much bigger than
// this anyway.
export const config = {
  api: {
    bodyParser: { sizeLimit: '8mb' },
  },
}

function safeFilename(name) {
  const cleaned = name.replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-')
  return `${Date.now()}-${cleaned}`
}

// Allowlist of real image formats, checked against the actual decoded
// bytes rather than the client-supplied MIME type or filename extension —
// both of those are just labels an attacker controls. This is what stops
// someone from uploading e.g. an .svg or .html file that would get served
// back from /images/... and execute in a browser (stored XSS). Resumes
// (application/pdf) are checked separately below since they go through the
// same endpoint but obviously aren't images.
const IMAGE_SIGNATURES = [
  { mime: 'image/png', bytes: [0x89, 0x50, 0x4e, 0x47] },
  { mime: 'image/jpeg', bytes: [0xff, 0xd8, 0xff] },
  { mime: 'image/gif', bytes: [0x47, 0x49, 0x46, 0x38] },
  // WebP: 'RIFF'....'WEBP' — two non-contiguous markers, checked separately.
]

function detectImageType(buffer) {
  for (const { mime, bytes } of IMAGE_SIGNATURES) {
    if (bytes.every((b, i) => buffer[i] === b)) return mime
  }
  if (
    buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'image/webp'
  }
  return null
}

const PDF_SIGNATURE = [0x25, 0x50, 0x44, 0x46] // '%PDF'
function isPdf(buffer) {
  return PDF_SIGNATURE.every((b, i) => buffer[i] === b)
}

// Folders that always live at a single fixed path (e.g. the resume, which
// the site always links to as /cv.pdf) instead of getting a fresh
// timestamped filename per upload. Each new upload here overwrites the
// previous file in place, so we need to look up its current sha first —
// GitHub's Contents API rejects an update without one.
const FIXED_PATHS = {
  resume: 'public/cv.pdf',
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

  if (!filename || !dataUrl) {
    return res.status(400).json({ error: 'filename and dataUrl are required.' })
  }
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl)
  if (!match) return res.status(400).json({ error: 'dataUrl must be a base64 data URL.' })
  const base64 = match[2]
  const decoded = Buffer.from(base64, 'base64')

  try {
    if (FIXED_PATHS[folder]) {
      // Currently only 'resume', which must actually be a PDF — checked
      // against real bytes, not the filename or client-supplied MIME type.
      if (!isPdf(decoded)) {
        return res.status(400).json({ error: 'That file is not a valid PDF.' })
      }
      const repoPath = FIXED_PATHS[folder]
      const { sha } = await getFile(repoPath)
      await putFile(repoPath, base64, sha || undefined, `admin: replace ${repoPath}`, { isBase64: true })
      return res.status(200).json({ path: `/${repoPath.replace(/^public\//, '')}` })
    }

    if (!detectImageType(decoded)) {
      return res.status(400).json({ error: 'That file is not a supported image (PNG, JPEG, GIF, or WebP).' })
    }

    const safeFolder = ['projects', 'blog', 'profile'].includes(folder) ? folder : 'uploads'
    const finalName = safeFilename(filename)
    const repoPath = `public/images/${safeFolder}/${finalName}`
    await putFile(repoPath, base64, undefined, `admin: upload image ${finalName}`, { isBase64: true })
    return res.status(200).json({ path: `/images/${safeFolder}/${finalName}` })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
