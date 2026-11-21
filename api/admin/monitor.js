import { requireAuth } from '../_lib/auth.js'
import { gh, checkToken, loadRepos, monitorTokens } from '../_lib/githubMonitor.js'
import { checkPulse, checkWynmail, readSettings } from '../_lib/health.js'

// Developer view of the admin (signed in only, read-only).
//   GET /api/admin/monitor?step=repos          every repo, latest pushes, pass / fail
//   GET /api/admin/monitor?step=repos&fresh=1  skip the 45-second copy
//   GET /api/admin/monitor?step=diagnostics    is GitHub, Wynmail and Pulse answering
//
// Tokens never leave the server: the answers hold names and numbers only.

async function contentToken() {
  const { GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO, GITHUB_BRANCH } = process.env
  if (!GITHUB_TOKEN) return { state: 'off', message: 'GITHUB_TOKEN is not set in Vercel.' }
  const info = await checkToken(GITHUB_TOKEN)
  if (!info.ok) return { state: 'bad', message: info.message }
  let repo = null
  try {
    const { res, data } = await gh(GITHUB_TOKEN, `/repos/${GITHUB_OWNER}/${GITHUB_REPO}`, { timeout: 10000 })
    repo = res.ok
      ? { name: `${GITHUB_OWNER}/${GITHUB_REPO}`, branch: GITHUB_BRANCH || 'main', canPush: data?.permissions?.push ?? null }
      : { name: `${GITHUB_OWNER}/${GITHUB_REPO}`, error: res.status === 404 ? 'GITHUB_OWNER / GITHUB_REPO point at a repo this token cannot see.' : `GitHub answered ${res.status}.` }
  } catch (err) {
    repo = { name: `${GITHUB_OWNER}/${GITHUB_REPO}`, error: err.message }
  }
  const state = repo?.error || repo?.canPush === false ? 'bad' : 'ok'
  return { state, ...info, repo }
}

async function monitorTokenChecks() {
  const { tokens, fallback } = monitorTokens()
  if (fallback) return { state: 'off', message: 'GITHUB_MONITOR_TOKEN is not set, so only the portfolio repo can be seen.', tokens: [] }
  const checked = await Promise.all(tokens.map(checkToken))
  const bad = checked.some((c) => !c.ok)
  return { state: bad ? 'bad' : 'ok', tokens: checked.map((c, i) => ({ n: i + 1, ...c })) }
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  if (!requireAuth(req, res)) return
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }
  const step = String(req.query.step || 'repos')
  try {
    if (step === 'repos') return res.status(200).json(await loadRepos({ fresh: req.query.fresh === '1' }))

    if (step === 'diagnostics') {
      const settings = await readSettings()
      const [content, monitor, wynmail, pulse] = await Promise.all([contentToken(), monitorTokenChecks(), checkWynmail(), checkPulse(settings)])
      return res.status(200).json({
        at: new Date().toISOString(),
        server: {
          commit: process.env.VERCEL_GIT_COMMIT_SHA || null,
          env: process.env.VERCEL_ENV || null,
          region: process.env.VERCEL_REGION || null,
          node: process.version,
        },
        github: { content, monitor },
        wynmail,
        pulse,
      })
    }
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
  return res.status(400).json({ error: 'Unknown step.' })
}
