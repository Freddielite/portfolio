import { useCallback, useEffect, useRef, useState } from 'react'
import { ClipboardCopy, RefreshCw } from 'lucide-react'
import { adminFetch } from '../http.js'
import { agoText, readCache, writeCache } from '../cache.js'
import { useOnRetry } from '../network.js'
import { useAdmin, useRefresh } from '../AdminContext.jsx'
import { IS_APP } from '../app.js'

// One place that says whether GitHub, Wynmail and Pulse are answering, how much
// GitHub allowance is left, and whether the email queue is healthy, with a Copy
// report button for pasting into a chat. Nothing secret is ever in the report: the
// server sends names and numbers only (api/admin/monitor.js?step=diagnostics).

const DOT = { ok: 'is-up', warn: 'is-degraded', bad: 'is-down', off: '' }
const WORD = { ok: 'OK', warn: 'Check', bad: 'Problem', off: 'Off' }

const short = (sha) => (sha ? String(sha).slice(0, 7) : null)
const nf = (n) => Number(n).toLocaleString('en-US')

async function fetchDiagnostics() {
  const [diag, build] = await Promise.all([
    adminFetch('/api/admin/monitor?step=diagnostics', { cache: 'no-store' }).then(async (res) => {
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || 'Could not run the checks.')
      return body
    }),
    fetch(`/build.json?ts=${Date.now()}`, { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
  ])
  return { ...diag, build }
}

function allowance(a, now) {
  if (!a) return null
  const mins = a.resetAt ? Math.max(0, Math.round((Date.parse(a.resetAt) - now) / 60000)) : null
  return `${nf(a.remaining)} of ${nf(a.limit)} left${mins != null ? `, resets in ${mins} min` : ''}`
}

// Days until a GitHub token stops working, when GitHub says.
function daysLeft(expiresAt, now) {
  const t = expiresAt ? Date.parse(expiresAt) : NaN
  return Number.isFinite(t) ? Math.ceil((t - now) / 86400000) : null
}

const lowAllowance = (a) => !!a && a.limit > 0 && a.remaining / a.limit < 0.1

// The screen's rows: { id, state, title, detail, meta }. The Copy report uses the same list.
export function buildRows(d, now = Date.now()) {
  const rows = []
  const b = d.build

  // This admin and the server that answered
  const mismatch = b?.commit && d.server?.commit && b.commit !== d.server.commit
  rows.push({
    id: 'site',
    state: b ? (mismatch ? 'warn' : 'ok') : 'warn',
    title: 'This admin',
    detail: b
      ? `Version ${b.version || '?'}${b.commit ? ` · commit ${short(b.commit)}` : ''}${b.builtAt ? ` · built ${agoText(Date.parse(b.builtAt), now)}` : ''}`
      : 'build.json could not be read (normal outside Vercel).',
    meta: mismatch ? 'A rebuild may be in progress' : [d.server?.env, d.server?.region].filter(Boolean).join(' · ') || null,
  })

  // GitHub, the token the admin saves with
  const c = d.github.content
  if (c.state === 'off') rows.push({ id: 'gh-content', state: 'off', title: 'GitHub: saving', detail: c.message })
  else if (c.state === 'bad' && !c.ok) rows.push({ id: 'gh-content', state: 'bad', title: 'GitHub: saving', detail: c.message })
  else {
    const left = daysLeft(c.expiresAt, now)
    const problems = []
    if (c.repo?.error) problems.push(c.repo.error)
    else if (c.repo?.canPush === false) problems.push('This token cannot write to the repo, so saves will fail.')
    if (lowAllowance(c.core)) problems.push('GitHub allowance is almost used up.')
    if (left != null && left <= 14) problems.push(left <= 0 ? 'This token has expired.' : `This token expires in ${left} day${left === 1 ? '' : 's'}.`)
    rows.push({
      id: 'gh-content',
      state: problems.length ? (c.state === 'bad' ? 'bad' : 'warn') : 'ok',
      title: 'GitHub: saving',
      detail: problems.length ? problems.join(' ') : `${c.repo?.name || 'repo'} · branch ${c.repo?.branch || 'main'} · signed in as ${c.login}`,
      meta: allowance(c.core, now),
    })
  }

  // GitHub, the token(s) for the Repos screen
  const m = d.github.monitor
  if (m.state === 'off') rows.push({ id: 'gh-repos', state: 'off', title: 'GitHub: repos view', detail: m.message })
  else
    for (const t of m.tokens) {
      const title = m.tokens.length > 1 ? `GitHub: repos view, token ${t.n}` : 'GitHub: repos view'
      if (!t.ok) {
        rows.push({ id: `gh-repos-${t.n}`, state: 'bad', title, detail: t.message })
        continue
      }
      const left = daysLeft(t.expiresAt, now)
      const problems = []
      if (lowAllowance(t.core) || lowAllowance(t.graphql)) problems.push('GitHub allowance is almost used up.')
      if (left != null && left <= 14) problems.push(left <= 0 ? 'This token has expired.' : `This token expires in ${left} day${left === 1 ? '' : 's'}.`)
      rows.push({
        id: `gh-repos-${t.n}`,
        state: problems.length ? 'warn' : 'ok',
        title,
        detail: problems.length ? problems.join(' ') : `Signed in as ${t.login} (${t.kind})`,
        meta: allowance(t.core, now),
      })
    }

  // Wynmail and its email queue
  const w = d.wynmail
  if (w.state === 'off' || w.state === 'bad') rows.push({ id: 'wynmail', state: w.state, title: 'Wynmail', detail: w.message })
  else
    rows.push({
      id: 'wynmail',
      state: w.state,
      title: 'Wynmail',
      detail: w.stuck.length
        ? `${w.stuck.length} post email${w.stuck.length === 1 ? ' is' : 's are'} stuck or did not fully go out: ${w.stuck.map((s) => s.slug).join(', ')}`
        : `Answering · email queue healthy${w.subscribers != null ? ` · ${nf(w.subscribers)} subscribers` : ''}`,
      meta: w.ms != null ? `${nf(w.ms)} ms` : null,
    })

  // Pulse
  const p = d.pulse
  if (p.state === 'off' || p.state === 'bad') rows.push({ id: 'pulse', state: p.state, title: 'Pulse', detail: p.message })
  else
    rows.push({
      id: 'pulse',
      state: p.down?.length ? 'warn' : 'ok',
      title: 'Pulse',
      detail: p.down?.length ? `${p.down.length} site${p.down.length === 1 ? '' : 's'} down: ${p.down.join(', ')}` : `Answering · ${p.up} of ${p.monitors} monitors up`,
      meta: p.ms != null ? `${nf(p.ms)} ms` : null,
    })

  return rows
}

export function reportText(d, rows, now = Date.now()) {
  const lines = [`Portfolio admin diagnostics, ${new Date(d.at || now).toISOString()}`]
  lines.push(`Running in: ${IS_APP ? 'the Android app' : 'a browser'} (${navigator.onLine ? 'online' : 'offline'})`)
  if (d.server?.node) lines.push(`Server: node ${d.server.node}${d.server.env ? `, ${d.server.env}` : ''}${d.server.region ? `, ${d.server.region}` : ''}`)
  lines.push('')
  for (const r of rows) lines.push(`[${WORD[r.state].toUpperCase()}] ${r.title}: ${r.detail}${r.meta ? ` (${r.meta})` : ''}`)
  return lines.join('\n')
}

async function copy(text) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.setAttribute('readonly', '')
    ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0'
    document.body.appendChild(ta)
    ta.select()
    let ok = false
    try {
      ok = document.execCommand('copy')
    } catch {
      /* fall through */
    }
    ta.remove()
    return ok
  }
}

function useNow(every = 30000) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), every)
    return () => clearInterval(t)
  }, [every])
  return now
}

export default function Diagnostics() {
  const { toast } = useAdmin()
  const cached = useRef(readCache('diagnostics'))
  const [state, setState] = useState(() => ({ loading: true, error: null, data: cached.current?.value || null, at: cached.current?.at || null }))
  const busy = useRef(false)
  const now = useNow()

  const load = useCallback(async () => {
    if (busy.current) return
    busy.current = true
    setState((s) => ({ ...s, loading: true, error: null }))
    try {
      const data = await fetchDiagnostics()
      writeCache('diagnostics', data)
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
    await load()
  })

  const { data } = state
  const rows = data ? buildRows(data, now) : []
  const issues = rows.filter((r) => r.state === 'bad' || r.state === 'warn').length

  async function onCopy() {
    if (!data) return
    const ok = await copy(reportText(data, rows))
    toast(ok ? 'Report copied' : 'Could not copy. Select the text and copy it yourself.', ok ? undefined : { tone: 'error' })
  }

  const hint = state.loading
    ? data
      ? `Updated ${agoText(state.at, now)}, checking again…`
      : 'Checking GitHub, Wynmail and Pulse…'
    : state.error && data
      ? `Could not update, showing ${agoText(state.at, now)}`
      : data
        ? issues
          ? `${issues} thing${issues === 1 ? '' : 's'} to look at`
          : 'Everything is answering'
        : ''

  return (
    <section className="admin-card" aria-busy={state.loading}>
      <div className="admin-card-header">
        <div>
          <h2 className="admin-card-title">Connections</h2>
          <p className="admin-hint">{hint}</p>
        </div>
        <div className="admin-diag-actions">
          <button type="button" className="admin-btn-ghost admin-btn-icon-text" onClick={onCopy} disabled={!data}>
            <ClipboardCopy size={15} aria-hidden="true" />
            Copy report
          </button>
          <button type="button" className="admin-icon-btn" onClick={load} disabled={state.loading} aria-label="Run the checks again">
            <RefreshCw size={16} className={state.loading ? 'admin-spin' : ''} aria-hidden="true" />
          </button>
        </div>
      </div>

      {state.error && !data && <p className="admin-error">{state.error}</p>}
      {state.error && data && <p className="admin-error admin-stale-error">{state.error}</p>}

      {!data && state.loading ? (
        <ul className="admin-monitors" aria-hidden="true">
          {[0, 1, 2, 3].map((i) => <li key={i} className="admin-skeleton" />)}
        </ul>
      ) : (
        <ul className={`admin-monitors admin-diag-list ${state.loading ? 'is-stale' : ''}`}>
          {rows.map((r) => (
            <li key={r.id}>
              <span className={`admin-status-dot ${DOT[r.state]}`} title={WORD[r.state]} aria-label={WORD[r.state]} />
              <span className="admin-monitor-name">
                <strong>{r.title}</strong>
                <span className="admin-hint admin-diag-detail">{r.detail}</span>
              </span>
              {r.meta && <span className="admin-monitor-stats"><span className="admin-hint">{r.meta}</span></span>}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
