import { verifyToken } from '../_lib/auth.js'
import { parseCookies } from '../_lib/cookies.js'

export default async function handler(req, res) {
  const cookies = parseCookies(req.headers.cookie)
  const authenticated = verifyToken(cookies.admin_session)
  if (!authenticated) return res.status(401).json({ authenticated: false })
  return res.status(200).json({ authenticated: true })
}
