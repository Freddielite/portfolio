import { useCallback, useEffect, useRef, useState } from 'react'
import { CheckCircle2, CircleDashed, CircleSlash, ClipboardCopy, ExternalLink, Loader2, RefreshCw, RotateCcw, XCircle } from 'lucide-react'
import { adminFetch } from '../http.js'
import { agoText } from '../cache.js'
import { useAdmin } from '../AdminContext.jsx'
import { copyText } from '../copyText.js'
import { openInApp } from '../native.js'

// What opens under a repo: its latest workflow runs, and for a run the jobs, the
// step that failed, the error from the log, and buttons to re-run it or to copy the
// failure so it can be pasted into a chat. Server side: api/admin/monitor.js.

const ICON = { failing: XCircle, running: Loader2, passing: CheckCircle2, cancelled: CircleSlash, skipped: CircleDashed, attention: CircleDashed, none: CircleDashed }
const WORD = { failing: 'Failed', running: 'Running', passing: 'Passed', cancelled: 'Cancelled', skipped: 'Skipped', attention: 'Needs approval', none: 'Unknown' }

async function api(path, options) {
  const res = await adminFetch(path, { cache: 'no-store', ...options })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.error || 'GitHub did not answer.')
  return body
}

const openLink = (url) => (e) => {
  if (window.Capacitor?.isNativePlatform?.()) {
    e.preventDefault()
    openInApp(url)
  }
}

function StateBadge({ state }) {
  const cls = state === 'failing' ? 'is-warn' : state === 'passing' ? 'is-published' : state === 'running' ? 'is-accent admin-badge-building' : ''
  return <span className={`admin-badge ${cls}`}>{WORD[state] || 'Unknown'}</span>
}

// The text that is easiest to paste into a chat to get help fixing a failed run.
export function failureReport({ repo, run, job, log }) {
  const lines = ['A GitHub Actions run failed and I need help fixing it.', '', `Repo: ${repo}`]
  lines.push(`Workflow: ${run.workflow}${run.event ? ` (${run.event}${run.branch ? ` on ${run.branch}` : ''})` : ''}`)
  lines.push(`Commit: ${String(run.sha || '').slice(0, 7)} "${run.title}"`)
  if (job) lines.push(`Failed job: ${job.name}${job.failedStep ? `, step: ${job.failedStep}` : ''}`)
  lines.push(`Run: ${run.url}`)
  if (log?.errors?.length) lines.push('', 'Errors:', ...log.errors.map((e) => `- ${e}`))
  if (log?.tail?.length) lines.push('', `Log${log.truncated ? ' (last lines)' : ''}:`, ...log.tail)
  return lines.join('\n')
}

function RunDetail({ repo, run, onRerun }) {
  const { toast, confirm } = useAdmin()
  const [jobs, setJobs] = useState({ loading: true, items: null, error: null })
  const [jobId, setJobId] = useState(null)
  const [log, setLog] = useState({ loading: false, data: null, error: null })
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let live = true
    api(`/api/admin/monitor?step=run&repo=${encodeURIComponent(repo)}&run=${run.id}`)
      .then((b) => {
        if (!live) return
        setJobs({ loading: false, items: b.jobs, error: null })
        const failed = b.jobs.find((j) => j.state === 'failing')
        if (failed) setJobId(failed.id)
      })
      .catch((e) => live && setJobs({ loading: false, items: null, error: e.message }))
    return () => {
      live = false
    }
  }, [repo, run.id])

  useEffect(() => {
    if (!jobId) return
    let live = true
    setLog({ loading: true, data: null, error: null })
    api(`/api/admin/monitor?step=log&repo=${encodeURIComponent(repo)}&job=${jobId}`)
      .then((d) => live && setLog({ loading: false, data: d, error: null }))
      .catch((e) => live && setLog({ loading: false, data: null, error: e.message }))
    return () => {
      live = false
    }
  }, [repo, jobId])

  const items = jobs.items || []
  const failedJobs = items.filter((j) => j.state === 'failing')
  const job = items.find((j) => j.id === jobId) || null
  const done = run.state !== 'running'

  async function rerun(failedOnly) {
    const ok = await confirm({
      title: failedOnly ? 'Re-run the failed jobs?' : 'Re-run every job?',
      body: `GitHub runs ${failedOnly ? 'only the jobs that failed' : 'all the jobs'} again on commit ${String(run.sha).slice(0, 7)}. If this workflow deploys something, it will deploy again.`,
      confirmLabel: 'Re-run',
    })
    if (!ok) return
    setBusy(true)
    try {
      await api('/api/admin/monitor?step=rerun', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ repo, run: run.id, failedOnly }) })
      toast('Re-run started')
      onRerun()
    } catch (e) {
      toast(e.message, { tone: 'error' })
    } finally {
      setBusy(false)
    }
  }

  async function copyFailure() {
    const ok = await copyText(failureReport({ repo, run, job, log: log.data }))
    toast(ok ? 'Copied. Paste it to Claude.' : 'Could not copy.', ok ? undefined : { tone: 'error' })
  }

  return (
    <div className="admin-run-detail">
      {jobs.loading && <p className="admin-hint">Reading the run…</p>}
      {jobs.error && <p className="admin-error">{jobs.error}</p>}

      {items.length > 0 && (
        <ul className="admin-job-list">
          {items.map((j) => {
            const Icon = ICON[j.state] || CircleDashed
            return (
              <li key={j.id} className={`is-${j.state}`}>
                <Icon size={15} className={j.state === 'running' ? 'admin-spin' : ''} aria-hidden="true" />
                <span className="admin-job-name">
                  {j.name}
                  {j.failedStep && <span className="admin-hint"> · failed at “{j.failedStep}”</span>}
                </span>
                {j.state === 'failing' && failedJobs.length > 1 && (
                  <button type="button" className="admin-btn-ghost admin-run-small" onClick={() => setJobId(j.id)} disabled={j.id === jobId}>
                    {j.id === jobId ? 'Showing' : 'Show log'}
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {log.loading && <p className="admin-hint">Loading the log…</p>}
      {log.error && <p className="admin-error">{log.error}</p>}
      {log.data && (
        <>
          {log.data.errors.length > 0 && (
            <ul className="admin-log-errors">
              {log.data.errors.map((e) => <li key={e}>{e}</li>)}
            </ul>
          )}
          <pre className="admin-log" tabIndex={0} aria-label="End of the job log">{log.data.tail.join('\n')}</pre>
          {log.data.truncated && <p className="admin-hint">Showing the last lines. Open the run on GitHub for the whole log.</p>}
        </>
      )}

      <div className="admin-run-actions">
        {done && run.state === 'failing' && (
          <button type="button" className="admin-btn admin-btn-icon-text" onClick={() => rerun(true)} disabled={busy}>
            <RotateCcw size={15} aria-hidden="true" /> Re-run failed jobs
          </button>
        )}
        {done && run.state !== 'failing' && (
          <button type="button" className="admin-btn-ghost admin-btn-icon-text" onClick={() => rerun(false)} disabled={busy}>
            <RotateCcw size={15} aria-hidden="true" /> Re-run all
          </button>
        )}
        {run.state === 'failing' && (
          <button type="button" className="admin-btn-ghost admin-btn-icon-text" onClick={copyFailure} disabled={jobs.loading || log.loading}>
            <ClipboardCopy size={15} aria-hidden="true" /> Copy for Claude
          </button>
        )}
        <a className="admin-btn-ghost admin-btn-icon-text admin-run-link" href={run.url} target="_blank" rel="noreferrer" onClick={openLink(run.url)}>
          <ExternalLink size={15} aria-hidden="true" /> Open on GitHub
        </a>
      </div>
    </div>
  )
}

export default function RepoRuns({ repo, now, onChanged }) {
  const [state, setState] = useState({ loading: true, runs: null, error: null })
  const [selected, setSelected] = useState(null)
  const timer = useRef(null)

  const load = useCallback(
    async (first = false) => {
      setState((s) => ({ ...s, loading: true, error: null }))
      try {
        const { runs } = await api(`/api/admin/monitor?step=runs&repo=${encodeURIComponent(repo)}`)
        setState({ loading: false, runs, error: null })
        // Open the newest run straight away when it failed: that is what you came to see.
        if (first && runs[0]?.state === 'failing') setSelected(runs[0].id)
      } catch (e) {
        setState((s) => ({ ...s, loading: false, error: e.message }))
      }
    },
    [repo],
  )

  useEffect(() => {
    load(true)
    return () => clearTimeout(timer.current)
  }, [load])

  // GitHub needs a moment to start the re-run before it shows up as Running.
  function afterRerun() {
    clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      load()
      onChanged?.()
    }, 4000)
  }

  const { runs } = state
  return (
    <div className="admin-repo-panel">
      <div className="admin-repo-panel-head">
        <span className="admin-hint">Latest runs</span>
        <button type="button" className="admin-icon-btn" onClick={() => load()} disabled={state.loading} aria-label="Refresh runs">
          <RefreshCw size={14} className={state.loading ? 'admin-spin' : ''} aria-hidden="true" />
        </button>
      </div>
      {state.error && <p className="admin-error">{state.error}</p>}
      {!runs && state.loading && <p className="admin-hint">Asking GitHub…</p>}
      {runs && !runs.length && <p className="admin-hint">No workflow runs yet. This repo does not use GitHub Actions, or nothing has run.</p>}
      {runs && runs.length > 0 && (
        <ul className="admin-run-list">
          {runs.map((r) => {
            const Icon = ICON[r.state] || CircleDashed
            const open = selected === r.id
            return (
              <li key={r.id} className={`is-${r.state} ${open ? 'is-open' : ''}`}>
                <button type="button" className="admin-run-row" aria-expanded={open} onClick={() => setSelected(open ? null : r.id)}>
                  <Icon size={16} className={r.state === 'running' ? 'admin-spin' : ''} aria-hidden="true" />
                  <span className="admin-activity-text">
                    <strong>{r.title || r.workflow}</strong>
                    <span className="admin-hint">{[r.workflow, r.branch, r.attempt > 1 ? `attempt ${r.attempt}` : null].filter(Boolean).join(' · ')}</span>
                  </span>
                  <span className="admin-activity-meta">
                    {r.at && <time dateTime={r.at} className="admin-hint">{agoText(Date.parse(r.at), now)}</time>}
                    <StateBadge state={r.state} />
                  </span>
                </button>
                {open && <RunDetail repo={repo} run={r} onRerun={afterRerun} />}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
