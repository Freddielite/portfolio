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

  return repos.map((r) => {
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
  const out = { total: repos.length, failing: 0, running: 0, passing: 0, none: 0 }
  for (const r of repos) {
    if (r.ci === 'failing') out.failing++
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
