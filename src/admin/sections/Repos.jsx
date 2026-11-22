import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertTriangle, CheckCircle2, ChevronDown, CircleDashed, CircleSlash, GitCommit, Loader2, Lock, RefreshCw, XCircle } from 'lucide-react'
import { adminFetch } from '../http.js'
import { agoText, readCache, writeCache } from '../cache.js'
import { useOnRetry } from '../network.js'
import { usePanel, useRefresh } from '../AdminContext.jsx'
import { openInApp } from '../native.js'
import Pager, { paginate } from '../Pager.jsx'
import RepoRuns from './RepoRuns.jsx'

// Every GitHub repo you can see, newest push first, with whether the latest push
// passed its checks. Read-only (see api/admin/monitor.js). Shown from the device
// cache at once and refreshed behind the scenes, once a minute while it is on screen.

const RANK = { failing: 0, attention: 1, running: 2, unknown: 3, passing: 4, none: 5 }
const ICON = { failing: XCircle, attention: AlertTriangle, running: Loader2, passing: CheckCircle2, none: CircleDashed, unknown: CircleSlash }
const WORD = { failing: 'Failing', attention: 'Needs attention', running: 'Running', passing: 'Passing', none: 'No checks', unknown: 'Unknown' }
const REFRESH_MS = 60 * 1000

async function fetchRepos(fresh) {
  const res = await adminFetch(`/api/admin/monitor?step=repos${fresh ? '&fresh=1' : ''}`, { cache: 'no-store' })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.error || 'Could not load your repos.')
  return body
}

function useNow(every = 30000) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), every)
    return () => clearInterval(t)
  }, [every])
  return now
}

// In the Android app a plain link would replace the admin; open GitHub in the in-app browser.
const openLink = (url) => (e) => {
  if (window.Capacitor?.isNativePlatform?.()) {
    e.preventDefault()
    openInApp(url)
  }
}

function Badge({ ci }) {
  if (ci === 'failing') return <span className="admin-badge is-warn">Failing</span>
  if (ci === 'attention') return <span className="admin-badge is-attn">Needs attention</span>
  if (ci === 'running') return <span className="admin-badge is-accent admin-badge-building">Running</span>
  if (ci === 'passing') return <span className="admin-badge is-published">Passing</span>
  return <span className="admin-badge">{WORD[ci] || 'Unknown'}</span>
}

// One repo. Tap it to open its latest workflow runs underneath (read the error,
// re-run, copy the failure); its GitHub link is in the panel header.
function RepoRow({ r, now, reload }) {
  const [open, setOpen] = useState(false)
  const Icon = ICON[r.ci] || CircleDashed
  const top = r.commits[0]
  return (
    <li className={`is-${r.ci} ${open ? 'is-open' : ''}`}>
      <div className="admin-repo-head">
        <button type="button" className="admin-repo-link admin-repo-toggle" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          <span className="admin-activity-icon" aria-hidden="true">
            <Icon size={17} className={r.ci === 'running' ? 'admin-spin' : ''} />
          </span>
          <span className="admin-activity-text">
            <strong>
              {r.fullName}
              {r.private && <Lock size={12} aria-label="Private" className="admin-repo-lock" />}
            </strong>
            <span className={`admin-hint ${r.reason ? 'admin-hint-wrap' : ''}`}>
              {r.reason ? `${r.branch} · ${r.reason.name} failed ${agoText(Date.parse(r.reason.at), now)}` : top ? `${r.branch} · ${top.message}` : r.branch || 'No commits yet'}
            </span>
          </span>
          <span className="admin-activity-meta">
            {r.pushedAt && <time dateTime={r.pushedAt} className="admin-hint">{agoText(Date.parse(r.pushedAt), now)}</time>}
            <Badge ci={r.ci} />
          </span>
          <ChevronDown size={16} className="admin-repo-chevron" aria-hidden="true" />
        </button>
      </div>
      {open && <RepoRuns repo={r.fullName} url={r.url} focusRun={r.reason?.runId} now={now} onChanged={reload} />}
    </li>
  )
}

export default function Repos() {
  const cached = useRef(readCache('repos'))
  const [state, setState] = useState(() => ({ loading: true, error: null, data: cached.current?.value || null, at: cached.current?.at || null }))
  const [feedPage, setFeedPage] = useState(1)
  const [repoPage, setRepoPage] = useState(1)
  const busy = useRef(false)
  const now = useNow()
  const { active } = usePanel()

  const load = useCallback(async (fresh = false) => {
    if (busy.current) return
    busy.current = true
    setState((s) => ({ ...s, loading: true, error: null }))
    try {
      const data = await fetchRepos(fresh)
      writeCache('repos', data)
      setState({ loading: false, error: null, data, at: Date.now() })
    } catch (err) {
      setState((s) => ({ ...s, loading: false, error: err.message }))
    } finally {
      busy.current = false
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])
  useOnRetry(load)
  useRefresh(async () => {
    await load(true)
  })

  // Quietly keep it fresh while this section is the one on screen.
  useEffect(() => {
    if (!active) return
    const tick = () => document.visibilityState === 'visible' && load()
    const t = setInterval(tick, REFRESH_MS)
    document.addEventListener('visibilitychange', tick)
    return () => {
      clearInterval(t)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [active, load])

  const { data } = state
  const repos = data ? [...data.repos].sort((a, b) => (RANK[a.ci] ?? 9) - (RANK[b.ci] ?? 9) || new Date(b.pushedAt || 0) - new Date(a.pushedAt || 0)) : []
  const reposPaged = paginate(repos, repoPage, 8)
  const feedPaged = paginate(data?.feed || [], feedPage, 6)
  const s = data?.summary
  const hint = state.loading
    ? data
      ? `Updated ${agoText(state.at, now)}, updating…`
      : 'Asking GitHub…'
    : state.error && data
      ? `Could not update, showing ${agoText(state.at, now)}`
      : s
        ? `${s.total} repo${s.total === 1 ? '' : 's'}${s.failing ? ` · ${s.failing} failing` : ''}${s.attention ? ` · ${s.attention} need${s.attention === 1 ? 's' : ''} attention` : ''}${s.running ? ` · ${s.running} running` : ''}`
        : 'From GitHub'

  return (
    <>
      <section className="admin-card" aria-busy={state.loading}>
        <div className="admin-card-header">
          <div>
            <h2 className="admin-card-title">Repos</h2>
            <p className="admin-hint">{hint}</p>
          </div>
          <button type="button" className="admin-icon-btn" onClick={() => load(true)} disabled={state.loading} aria-label="Refresh repos">
            <RefreshCw size={16} className={state.loading ? 'admin-spin' : ''} aria-hidden="true" />
          </button>
        </div>

        {state.error && !data && <p className="admin-error">{state.error}</p>}
        {state.error && data && <p className="admin-error admin-stale-error">{state.error}</p>}

        {data && !data.setup && (
          <p className="admin-hint">
            Not connected. In Vercel, add <strong>GITHUB_MONITOR_TOKEN</strong> (a GitHub token with read-only access to your repos), then redeploy.
          </p>
        )}
        {data?.setup && data.fallback && (
          <p className="admin-hint admin-repos-note">
            Only the portfolio repo is visible, because <strong>GITHUB_MONITOR_TOKEN</strong> is not set. Add it in Vercel to see all your repos.
          </p>
        )}
        {data?.problems?.map((p) => (
          <p key={`${p.token}-${p.message}`} className="admin-error admin-stale-error">
            {data.problems.length > 1 || p.token > 1 ? `Token ${p.token}: ` : ''}
            {p.message}
          </p>
        ))}

        {!data && state.loading && (
          <ul className="admin-activity" aria-hidden="true">
            {[0, 1, 2, 3].map((i) => <li key={i} className="admin-skeleton admin-activity-skeleton" />)}
          </ul>
        )}

        {data?.setup && !repos.length && !state.loading && <p className="admin-hint">No repos found for this token.</p>}

        {repos.length > 0 && (
          <>
            <ul className="admin-activity admin-repo-list admin-repo-items">
              {reposPaged.items.map((r) => (
                <RepoRow key={r.fullName} r={r} now={now} reload={() => load(true)} />
              ))}
            </ul>
            <Pager p={reposPaged} onPage={setRepoPage} label="repos" />
          </>
        )}
      </section>

      {data?.feed?.length > 0 && (
        <section className="admin-card">
          <div className="admin-card-header">
            <div>
              <h2 className="admin-card-title">Recent pushes</h2>
              <p className="admin-hint">Latest commits across your repos</p>
            </div>
          </div>
          <ul className="admin-activity admin-repo-list">
            {feedPaged.items.map((c) => (
              <li key={`${c.repo}-${c.sha}`} className={`is-${c.ci}`}>
                <a className="admin-repo-link" href={c.url} target="_blank" rel="noreferrer" onClick={openLink(c.url)}>
                  <span className="admin-activity-icon" aria-hidden="true"><GitCommit size={17} /></span>
                  <span className="admin-activity-text">
                    <strong>{c.message || 'No message'}</strong>
                    <span className="admin-hint">{c.repo}{c.author ? ` · ${c.author}` : ''}</span>
                  </span>
                  <span className="admin-activity-meta">
                    <time dateTime={c.at} className="admin-hint">{agoText(Date.parse(c.at), now)}</time>
                    <Badge ci={c.ci} />
                  </span>
                </a>
              </li>
            ))}
          </ul>
          <Pager p={feedPaged} onPage={setFeedPage} label="pushes" />
        </section>
      )}
    </>
  )
}
