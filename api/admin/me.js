import { requireAuth, UNLOCK_MINUTES } from '../_lib/auth.js'

// Is this browser signed in (and, with fingerprint unlock on, unlocked)?
// Answers 401 with { locked: true } when signed in but locked.
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  const session = requireAuth(req, res)
  if (!session) return
  return res.status(200).json({ authenticated: true, lock: !!session.lock, lockMinutes: UNLOCK_MINUTES })
}
