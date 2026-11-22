// A read-only look at ALL of your GitHub repos (not just the portfolio one):
// which ones were pushed to lately, and whether the latest push passed its checks
// (GitHub Actions and any other CI that reports to GitHub).
//
// Tokens: set GITHUB_MONITOR_TOKEN in Vercel. A GitHub fine-grained token can only
// see ONE owner (you, or one organisation), so to cover both your own repos and an
// organisation's, put one token per owner in the same variable, separated by commas.
// Each token needs read-only access to: Metadata, Contents, Actions, Checks and
// Commit statuses. Without GITHUB_MONITOR_TOKEN this falls back to the admin's own
// token, which only sees the portfolio repo.
//
// Cost: one REST call (the repo list) plus one GraphQL call (every repo's latest
// commits and check state at once) per token, and the answer is kept for 45 seconds.

const API = 'https://api.github.com'
const CACHE_MS = 45 * 1000
const DEFAULT_REPOS = 30

export function monitorTokens() {
  const list = String(process.env.GITHUB_MONITOR_TOKEN || '')
    .split(/[\s,]+/)
    .map((t) => t.trim())
    .filter(Boolean)
  if (list.length) return { tokens: list, fallback: false }
  const own = String(process.env.GITHUB_TOKEN || '').trim()
  return { tokens: own ? [own] : [], fallback: true }
}

const headers = (token) => ({
  Authorization: `Bearer ${token}`,
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
  'User-Agent': 'portfolio-admin',
})

// One request to GitHub with a time limit. Returns { res, data } and never throws
// for an HTTP error status (callers decide); it throws only when GitHub is unreachable.
export async function gh(token, path, { method = 'GET', body, timeout = 15000 } = {}) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeout)
  try {
    const res = await fetch(path.startsWith('http') ? path : `${API}${path}`, {
      method,
      headers: body ? { ...headers(token), 'Content-Type': 'application/json' } : headers(token),
      body: body ? JSON.stringify(body) : undefined,
      signal: ctrl.signal,
      cache: 'no-store',
    })
    const data = await res.json().catch(() => null)
    return { res, data }
  } catch (err) {
    throw new Error(err.name === 'AbortError' ? 'GitHub took too long to answer.' : 'Could not reach GitHub.')
  } finally {
    clearTimeout(timer)
  }
}

const explain = (res, data) => {
  if (res.status === 401) return 'GitHub did not accept this token (wrong, expired or revoked).'
  if (res.status === 403 && res.headers.get('x-ratelimit-remaining') === '0') return 'GitHub allowance used up for now.'
  if (res.status === 403) return 'This token is missing a permission it needs.'
  return `GitHub answered ${res.status}${data?.message ? `: ${data.message}` : ''}`
}

// GitHub's rollup of a commit's checks -> one plain word.
export function ciState(rollupState) {
  switch (rollupState) {
    case 'SUCCESS':
      return 'passing'
    case 'FAILURE':
    case 'ERROR':
      return 'failing'
    case 'PENDING':
    case 'EXPECTED':
      return 'running'
    default:
      return 'none' // no checks on this commit
  }
}

const NODES_QUERY = `query($ids:[ID!]!){
  nodes(ids:$ids){
    ... on Repository {
      id
      defaultBranchRef {
        name
        target {
          ... on Commit {
            history(first:3){
              nodes{
                oid
                messageHeadline
                committedDate
                url
                author{ name user{ login } }
                statusCheckRollup{ state }
              }
            }
          }
        }
      }
    }
  }
}`

const shortMessage = (m) => String(m || '').split('\n')[0].slice(0, 140)

// ---- A repo is also judged by its workflows, not only by its latest commit --------
// A commit's check rollup only covers the checks attached to that commit. A scheduled
// workflow (a cron job such as "Reminders") can fail every day while the latest commit
// still shows green. So each repo's recent runs on its default branch are read too, and
// the repo needs attention (amber) when the latest run of ANY workflow failed.
//
// Cost: one request per repo, kept for 5 minutes, and after that a conditional request
// (GitHub does not count a "nothing changed" answer against the allowance).

const RUNS_TTL_MS = 5 * 60 * 1000
const RUN_WINDOW_MS = 14 * 24 * 60 * 60 * 1000 // a workflow that last ran longer ago than this is not "current"
const runsCache = new Map() // repo -> { at, etag, runs }

const trimRun = (r) => ({
  id: r.id,
  workflow_id: r.workflow_id,
  name: r.name || 'Workflow',
  status: r.status,
  conclusion: r.conclusion,
  run_attempt: r.run_attempt || 1,
  updated_at: r.updated_at,
  created_at: r.created_at,
})

// runs: newest first. Looks at the latest run of each workflow.
export function workflowVerdict(runs, now = Date.now()) {
  const latest = new Map()
  for (const r of runs) if (!latest.has(r.workflow_id)) latest.set(r.workflow_id, r)
  let failing = null
  let running = null
  let passing = false
  for (const r of latest.values()) {
    if (now - Date.parse(r.updated_at || r.created_at) > RUN_WINDOW_MS) continue
    const st = runState(r)
    if (st === 'failing') failing = failing || r
    else if (st === 'running') running = running || r
    else if (st === 'passing') passing = true
  }
  return { failing, running, passing }
}

// The commit's own verdict and the workflows' verdict -> one word.
//   failing    the latest commit's checks failed (red)
//   attention  the commit is fine, but a workflow's latest run failed, e.g. a scheduled job (amber)
export function combineCi(commitCi, v) {
  if (commitCi === 'failing') return 'failing'
  if (v?.failing) return 'attention'
  if (v?.running || commitCi === 'running') return 'running'
  if (commitCi === 'passing' || v?.passing) return 'passing'
  return commitCi
}

async function recentRuns(token, repo, branch) {
  const hit = runsCache.get(repo)
  if (hit && Date.now() - hit.at < RUNS_TTL_MS) return hit.runs
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 10000)
  try {
    const res = await fetch(`${API}/repos/${repo}/actions/runs?per_page=30${branch ? `&branch=${encodeURIComponent(branch)}` : ''}`, {
      headers: hit?.etag ? { ...headers(token), 'If-None-Match': hit.etag } : headers(token),
      signal: ctrl.signal,
      cache: 'no-store',
    })
    if (res.status === 304 && hit) {
      hit.at = Date.now()
      return hit.runs
    }
    if (!res.ok) return null // cannot tell (no Actions here, or no permission): keep the commit's answer
    const data = await res.json()
    const runs = (data?.workflow_runs || []).map(trimRun)
    runsCache.set(repo, { at: Date.now(), etag: res.headers.get('etag'), runs })
    return runs
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

async function mapLimit(items, limit, fn) {
  const out = new Array(items.length)
  let next = 0
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++
        out[i] = await fn(items[i])
      }
    }),
  )
  return out
}

// The repos one token can see, newest push first, each with its latest commits.
async function reposForToken(token, limit) {
  const list = await gh(token, `/user/repos?sort=pushed&direction=desc&per_page=${limit}&affiliation=owner,collaborator,organization_member`)
  if (!list.res.ok) throw new Error(explain(list.res, list.data))
  const repos = (Array.isArray(list.data) ? list.data : []).filter((r) => !r.archived && !r.disabled)
  if (!repos.length) return []

  let byId = new Map()
  let ciProblem = null
  try {
    const q = await gh(token, '/graphql', { method: 'POST', body: { query: NODES_QUERY, variables: { ids: repos.map((r) => r.node_id) } }, timeout: 20000 })
    if (!q.res.ok || q.data?.errors?.length) {
      ciProblem = q.res.ok ? q.data.errors[0]?.message || 'GitHub could not return check results.' : explain(q.res, q.data)
    }
    for (const n of q.data?.data?.nodes || []) if (n?.id) byId.set(n.id, n)
  } catch (err) {
    ciProblem = err.message
  }

  const built = repos.map((r) => {
    const node = byId.get(r.node_id)
    const commits = (node?.defaultBranchRef?.target?.history?.nodes || []).map((c) => ({
      sha: c.oid,
      message: shortMessage(c.messageHeadline),
      at: c.committedDate,
      url: c.url,
      author: c.author?.user?.login || c.author?.name || null,
      ci: ciState(c.statusCheckRollup?.state),
    }))
    return {
      id: r.node_id,
      name: r.name,
      fullName: r.full_name,
      url: r.html_url,
      private: !!r.private,
      fork: !!r.fork,
      branch: node?.defaultBranchRef?.name || r.default_branch || null,
      pushedAt: r.pushed_at || null,
      commits,
      ci: commits[0]?.ci || (ciProblem ? 'unknown' : 'none'),
      ciProblem,
    }
  })

  // Also read each repo's workflows (see above) and let a failing one turn the repo red.
  const verdicts = await mapLimit(built, 6, (r) => recentRuns(token, r.fullName, r.branch).then((runs) => (runs ? workflowVerdict(runs) : null)))
  built.forEach((r, i) => {
    const v = verdicts[i]
    if (!v) return
    const commitCi = r.ci
    r.ci = combineCi(commitCi, v)
    // When the commit itself is fine but a workflow failed, say which one.
    if (v.failing && commitCi !== 'failing') {
      r.reason = { kind: 'workflow', name: v.failing.name, runId: v.failing.id, attempt: v.failing.run_attempt, at: v.failing.updated_at || v.failing.created_at }
    }
  })
  return built
}

let cache = null
let inflight = null

export async function loadRepos({ fresh = false, limit = DEFAULT_REPOS } = {}) {
  if (!fresh && cache && Date.now() - cache.at < CACHE_MS) return cache.value
  if (inflight) return inflight
  inflight = (async () => {
    const { tokens, fallback } = monitorTokens()
    if (!tokens.length) return { setup: false, repos: [], feed: [], summary: counts([]), problems: [], fallback, at: new Date().toISOString() }

    const settled = await Promise.allSettled(tokens.map((t) => reposForToken(t, limit)))
    const problems = []
    const seen = new Map()
    settled.forEach((s, i) => {
      if (s.status === 'rejected') problems.push({ token: i + 1, message: s.reason?.message || 'Failed.' })
      else
        for (const r of s.value) {
          if (!seen.has(r.fullName)) seen.set(r.fullName, r)
          if (r.ciProblem && !problems.some((p) => p.token === i + 1)) problems.push({ token: i + 1, message: `Check results unavailable: ${r.ciProblem}` })
        }
    })
    const repos = [...seen.values()].sort((a, b) => new Date(b.pushedAt || 0) - new Date(a.pushedAt || 0)).slice(0, limit * Math.max(1, tokens.length))
    repos.forEach((r) => delete r.ciProblem)
    const feed = repos
      .flatMap((r) => r.commits.map((c) => ({ ...c, repo: r.fullName, repoUrl: r.url, private: r.private })))
      .sort((a, b) => new Date(b.at) - new Date(a.at))
      .slice(0, 30)
    const value = { setup: true, fallback, repos, feed, summary: counts(repos), problems, at: new Date().toISOString() }
    // Only keep an answer that actually had something in it.
    if (repos.length || !problems.length) cache = { at: Date.now(), value }
    return value
  })().finally(() => {
    inflight = null
  })
  return inflight
}

export function counts(repos) {
  const out = { total: repos.length, failing: 0, attention: 0, running: 0, passing: 0, none: 0 }
  for (const r of repos) {
    if (r.ci === 'failing') out.failing++
    else if (r.ci === 'attention') out.attention++
    else if (r.ci === 'running') out.running++
    else if (r.ci === 'passing') out.passing++
    else out.none++
  }
  return out
}

// ---- Diagnostics: is this token alive, what can it do, how much allowance is left.
// GitHub's /rate_limit and /user do not use up the allowance they report.
export async function checkToken(token) {
  try {
    const [who, limit] = await Promise.all([gh(token, '/user', { timeout: 10000 }), gh(token, '/rate_limit', { timeout: 10000 })])
    if (!who.res.ok) return { ok: false, message: explain(who.res, who.data) }
    const core = limit.data?.resources?.core
    const graphql = limit.data?.resources?.graphql
    const at = (x) => (x ? { remaining: x.remaining, limit: x.limit, resetAt: x.reset ? new Date(x.reset * 1000).toISOString() : null } : null)
    return {
      ok: true,
      login: who.data?.login || null,
      kind: who.res.headers.get('x-oauth-scopes') !== null ? 'classic' : 'fine-grained',
      expiresAt: who.res.headers.get('github-authentication-token-expiration') || null,
      core: at(core),
      graphql: at(graphql),
    }
  } catch (err) {
    return { ok: false, message: err.message }
  }
}

// ---- Workflow runs: list them, read why one failed, run it again ----------------
// A repo can sit under any of the tokens (one per owner), so each call tries the
// tokens in turn and keeps the most useful error if none works.

export class HttpError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

export function validRepo(repo) {
  const parts = String(repo || '').split('/')
  return parts.length === 2 && parts.every((p) => /^[A-Za-z0-9_.-]{1,100}$/.test(p) && p !== '.' && p !== '..')
}
export const validId = (id) => /^\d{1,18}$/.test(String(id || ''))

// 403 (a permission is missing) is more useful to report than 404 (this token cannot see it).
const worse = (a, b) => (b.res.status === 403 && a.res.status !== 403) || (a.res.status === 404 && b.res.status !== 404)

async function tryTokens(call, { forbidden } = {}) {
  const { tokens } = monitorTokens()
  if (!tokens.length) throw new HttpError(400, 'GITHUB_MONITOR_TOKEN is not set in Vercel.')
  let best = null
  for (const token of tokens) {
    const got = await call(token)
    if (got.res.ok) return got
    if (!best || worse(best, got)) best = got
  }
  const status = best.res.status
  if (status === 403 && forbidden) throw new HttpError(403, forbidden)
  if (status === 404) throw new HttpError(404, 'GitHub could not find that (or no token you added can see it, or it was deleted).')
  throw new HttpError(status >= 500 ? 502 : 400, explain(best.res, best.data))
}

// One run or job -> one plain word.
export function runState(x) {
  if (!x) return 'none'
  if (x.status && x.status !== 'completed') return 'running' // queued, waiting, in progress
  switch (x.conclusion) {
    case 'success':
      return 'passing'
    case 'failure':
    case 'timed_out':
    case 'startup_failure':
      return 'failing'
    case 'cancelled':
      return 'cancelled'
    case 'skipped':
    case 'neutral':
      return 'skipped'
    case 'action_required':
      return 'attention'
    default:
      return 'none'
  }
}

export async function listRuns(repo) {
  const { data } = await tryTokens((t) => gh(t, `/repos/${repo}/actions/runs?per_page=8`))
  return (data?.workflow_runs || []).map((r) => ({
    id: r.id,
    workflow: r.name || 'Workflow',
    title: shortMessage(r.display_title || r.head_commit?.message || r.name),
    event: r.event,
    branch: r.head_branch,
    sha: r.head_sha,
    attempt: r.run_attempt || 1,
    state: runState(r),
    at: r.run_started_at || r.created_at,
    url: r.html_url,
  }))
}

export async function getJobs(repo, runId) {
  const { data } = await tryTokens((t) => gh(t, `/repos/${repo}/actions/runs/${runId}/jobs?filter=latest&per_page=50`))
  return (data?.jobs || []).map((j) => {
    const steps = (j.steps || []).map((s) => ({ number: s.number, name: s.name, state: runState(s) }))
    return { id: j.id, name: j.name, state: runState(j), url: j.html_url, steps, failedStep: steps.find((s) => s.state === 'failing')?.name || null }
  })
}

const ANSI = /\u001b\[[0-9;]*[A-Za-z]/g
const STAMP = /^\ufeff?\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z ?/
const TAIL_LINES = 70
const TAIL_BYTES = 12000

// A job log is long and noisy. Keep what explains a failure: the lines GitHub marked
// as errors, and the last stretch of the log (where the failing command usually is).
export function summariseLog(text) {
  const raw = String(text || '').slice(-400000).split(/\r?\n/)
  const lines = []
  const errors = []
  for (let line of raw) {
    line = line.replace(ANSI, '').replace(STAMP, '')
    if (!line.trim()) continue
    if (/^##\[endgroup\]/.test(line)) continue
    let m
    if ((m = /^##\[group\](.*)$/.exec(line))) line = `> ${m[1]}`
    else if ((m = /^##\[error\](.*)$/.exec(line))) {
      const msg = m[1].trim()
      if (msg && !errors.includes(msg) && errors.length < 10) errors.push(msg.slice(0, 400))
      line = `ERROR: ${msg}`
    } else if ((m = /^##\[warning\](.*)$/.exec(line))) line = `warning: ${m[1]}`
    lines.push(line.length > 400 ? `${line.slice(0, 400)}...` : line)
  }
  let tail = lines.slice(-TAIL_LINES)
  while (tail.length > 1 && tail.join('\n').length > TAIL_BYTES) tail = tail.slice(1)
  return { errors, tail, truncated: lines.length > tail.length }
}

export async function getJobLog(repo, jobId) {
  const { tokens } = monitorTokens()
  if (!tokens.length) throw new HttpError(400, 'GITHUB_MONITOR_TOKEN is not set in Vercel.')
  let last = null
  for (const token of tokens) {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 20000)
    try {
      // GitHub answers with a redirect to a short-lived download link; fetch follows it.
      const res = await fetch(`${API}/repos/${repo}/actions/jobs/${jobId}/logs`, { headers: headers(token), signal: ctrl.signal, cache: 'no-store' })
      if (res.ok) return summariseLog(await res.text())
      last = res
    } catch (err) {
      throw new HttpError(504, err.name === 'AbortError' ? 'GitHub took too long to send the log.' : 'Could not reach GitHub.')
    } finally {
      clearTimeout(timer)
    }
  }
  if (last?.status === 403) throw new HttpError(403, 'This token cannot read logs. It needs Actions: Read-only (or Read and write).')
  throw new HttpError(404, 'The log is not available (it may still be running, or older than 90 days).')
}

export async function rerunRun(repo, runId, { failedOnly = true } = {}) {
  await tryTokens((t) => gh(t, `/repos/${repo}/actions/runs/${runId}/${failedOnly ? 'rerun-failed-jobs' : 'rerun'}`, { method: 'POST' }), {
    forbidden: 'This token can only read. To re-run, change its Actions permission to "Read and write" in GitHub (Settings > Developer settings > your token), then try again.',
  })
  cache = null // the repo list is about to change
  return { ok: true }
}

// What the phone needs for repo alerts: only repos whose latest push has a clear pass or
// fail. Running, "no checks" and unknown are left out on purpose, so the phone keeps the
// last state it saw instead of announcing a repo that is merely busy.
export function phoneCi(result) {
  if (!result?.setup) return { ci: null, reason: 'not-set-up' }
  if (!result.repos.length && result.problems?.length) return { ci: null, reason: 'github-unreachable' }
  return {
    ci: result.repos
      .filter((r) => r.ci === 'failing' || r.ci === 'attention' || r.ci === 'passing')
      .map((r) => ({
        repo: r.fullName,
        // The phone only knows failing and passing; something that needs attention is a failure to it.
        state: r.ci === 'attention' ? 'failing' : r.ci,
        // A failing workflow is told apart by its run (and attempt), a failing commit by its sha.
        sha: r.reason?.runId ? `run${r.reason.runId}-${r.reason.attempt}` : r.commits[0]?.sha || '',
        message: r.reason ? `${r.reason.name} failed` : r.commits[0]?.message || '',
      })),
  }
}
