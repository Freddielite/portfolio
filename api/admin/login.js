import { createToken, passwordsMatch } from '../_lib/auth.js'
import { serializeCookie } from '../_lib/cookies.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!process.env.ADMIN_PASSWORD || !process.env.SESSION_SECRET) {
    return res.status(500).json({
      error:
        'Admin panel is not configured yet. Set ADMIN_PASSWORD and SESSION_SECRET in your Vercel project env vars, then redeploy.',
    })
  }

  let body = req.body
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body)
    } catch {
      body = {}
    }
  }

  const { password } = body || {}
  if (!password || !passwordsMatch(password, process.env.ADMIN_PASSWORD)) {
    return res.status(401).json({ error: 'Incorrect password.' })
  }

  const token = createToken()
  res.setHeader('Set-Cookie', serializeCookie('admin_session', token, { maxAge: 8 * 60 * 60 }))
  return res.status(200).json({ ok: true })
}
