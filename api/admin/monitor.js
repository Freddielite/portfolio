import { requireAuth } from '../_lib/auth.js'
import { gh, checkToken, loadRepos, monitorTokens, listRuns, getJobs, getJobLog, rerunRun, validRepo, validId, HttpError } from '../_lib/githubMonitor.js'
import { checkPulse, checkWynmail, readSettings } from '../_lib/health.js'

// Developer view of the admin (signed in only).
//   GET  ?step=repos[&fresh=1]            every repo, latest pushes, pass / fail
//   GET  ?step=diagnostics                is GitHub, Wynmail and Pulse answering
//   GET  ?step=runs&repo=owner/name       the repo's latest workflow runs
//   GET  ?step=run&repo=...&run=ID        the jobs of one run and which step failed
//   GET  ?step=log&repo=...&job=ID        why a job failed (error lines + end of the log)
//   POST ?step=rerun  { repo, run, failedOnly }   run it again (needs Actions: Read and write)
//
// Tokens never leave the server: the answers hold names, numbers and log text only.

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

function repoParam(value) {
  if (!validRepo(value)) throw new HttpError(400, 'That is not a repo name.')
  return String(value)
}
function idParam(value, what) {
  if (!validId(value)) throw new HttpError(400, `That is not a ${what} id.`)
  return String(value)
}

function readBody(req) {
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body)
    } catch {
      return {}
    }
  }
  return req.body || {}
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  if (!requireAuth(req, res)) return
  const step = String(req.query.step || 'repos')
  const wants = step === 'rerun' ? 'POST' : 'GET'
  if (req.method !== wants) {
    res.setHeader('Allow', wants)
    return res.status(405).json({ error: 'Method not allowed' })
  }
  try {
    if (step === 'repos') return res.status(200).json(await loadRepos({ fresh: req.query.fresh === '1' }))

    if (step === 'runs') return res.status(200).json({ runs: await listRuns(repoParam(req.query.repo)) })

    if (step === 'run') return res.status(200).json({ jobs: await getJobs(repoParam(req.query.repo), idParam(req.query.run, 'run')) })

    if (step === 'log') return res.status(200).json(await getJobLog(repoParam(req.query.repo), idParam(req.query.job, 'job')))

    if (step === 'rerun') {
      const body = readBody(req)
      const out = await rerunRun(repoParam(body.repo), idParam(body.run, 'run'), { failedOnly: body.failedOnly !== false })
      return res.status(200).json(out)
    }

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
    return res.status(err instanceof HttpError ? err.status : 500).json({ error: err.message })
  }
  return res.status(400).json({ error: 'Unknown step.' })
}
