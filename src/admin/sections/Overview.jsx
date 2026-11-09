import { useCallback, useEffect, useRef, useState } from 'react'
import { BarChart3, Check, ChevronRight, ChevronDown, FolderKanban, MessageSquareQuote, PenLine, RefreshCw, Download, Upload } from 'lucide-react'
import { CONTENT_TYPES, countOf, getContent, mergeContent, putContent } from '../api.js'
import { onContent } from '../contentBus.js'
import Pager, { paginate } from '../Pager.jsx'
import { useAdmin, useRefresh } from '../AdminContext.jsx'
import { setBadge } from '../app.js'
import { saveFile } from '../native.js'
import SecurityCard from './SecurityCard.jsx'
import { postState } from '../../lib/postStatus.js'

const PLACEHOLDER_AUTHOR = /^client name$/i
const LABELS = { siteSettings: 'Site settings', projects: 'Projects', skills: 'Skills', testimonials: 'Testimonials', posts: 'Published posts', drafts: 'Draft posts' }

function useAllContent() {
  const [state, setState] = useState({ loading: true, data: null, error: null, checkedAt: null })
  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }))
    try {
      const entries = await Promise.all(CONTENT_TYPES.map(async (t) => [t, (await getContent(t, { optional: t === 'drafts' })).data]))
      const data = Object.fromEntries(entries)
      setState({ loading: false, data, error: null, checkedAt: Date.now() })
      return data
    } catch (err) {
      setState((s) => ({ ...s, loading: false, error: err.message }))
      return null
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // Follow edits made in the other tabs as soon as they load or save.
  useEffect(
    () =>
      onContent((type, value) =>
        setState((s) => (s.data && type in s.data ? { ...s, data: { ...s.data, [type]: value } } : s))
      ),
    []
  )

  return { ...state, reload: load }
}

function buildChecklist(d, origin) {
  const s = d.siteSettings || {}
  const projects = (d.projects || []).filter((p) => !p.hidden)
  const noShot = projects.filter((p) => !p.image)
  const noAlt = projects.filter((p) => p.image && !p.imageAlt)
  const placeholders = (d.testimonials || []).filter((t) => PLACEHOLDER_AUTHOR.test(String(t.author || '').trim()))
  const thin = (d.posts || []).filter((p) => String(p.excerpt || '').length < 70)
  const metaLen = String(s.metaDescription || '').length
  const list = (items, key) => items.map((x) => x[key]).join(', ')
  return [
    { id: 'url', ok: String(s.siteUrl || '').replace(/\/$/, '') === origin, title: 'Site URL matches this address', detail: `Settings say ${s.siteUrl || 'nothing'}, you are on ${origin}. This feeds Google and link previews.`, tab: 'settings', field: 'siteUrl' },
    { id: 'linkedin', ok: !!s.linkedinUrl, title: 'LinkedIn URL is set', detail: 'It is empty. Useful for remote job applications.', tab: 'settings', field: 'linkedinUrl' },
    { id: 'form', ok: !!s.formspreeId, title: 'Contact form sends to your inbox', detail: 'No Formspree ID yet, so briefs only go out by email, WhatsApp or copy.', tab: 'settings', field: 'formspreeId' },
    { id: 'pulse', ok: !!(s.pulseApiUrl && s.pulseStatusToken), title: 'Live status chips are connected', detail: 'Add your Pulse API URL and status page token.', tab: 'settings', field: s.pulseApiUrl ? 'pulseStatusToken' : 'pulseApiUrl' },
    { id: 'newsletter', ok: !!(s.newsletterApiUrl && s.newsletterFormSlug), title: 'Newsletter signup is connected', detail: 'Add your Wynmail API URL and signup form slug so visitors can subscribe.', tab: 'settings', field: s.newsletterApiUrl ? 'newsletterFormSlug' : 'newsletterApiUrl' },
    { id: 'meta', ok: metaLen >= 70 && metaLen <= 160, title: 'Meta description is 70 to 160 characters', detail: `It is ${metaLen} characters.`, tab: 'settings', field: 'metaDescription' },
    { id: 'names', ok: placeholders.length === 0, title: 'Testimonials have real names', detail: `${placeholders.length} still say "Client name".`, tab: 'testimonials' },
    { id: 'shots', ok: noShot.length === 0, title: 'Every project has a screenshot', detail: `Missing: ${list(noShot, 'name')}.`, tab: 'projects' },
    { id: 'alt', ok: noAlt.length === 0, title: 'Screenshots have alt text', detail: `Missing on: ${list(noAlt, 'name')}.`, tab: 'projects' },
    { id: 'summary', ok: thin.length === 0, title: 'Every post has a good summary', detail: `Too short on: ${list(thin, 'title')}.`, tab: 'posts' },
  ]
}

function ago(ts, now) {
  if (!ts) return ''
  const s = Math.round((now - ts) / 1000)
  if (s < 10) return 'just now'
  if (s < 60) return `${s} seconds ago`
  const m = Math.round(s / 60)
  return m === 1 ? 'a minute ago' : m < 60 ? `${m} minutes ago` : 'over an hour ago'
}

function useNow(every = 15000) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), every)
    return () => clearInterval(t)
  }, [every])
  return now
}

function Checklist({ data, loading, checkedAt, onRecheck, go }) {
  const now = useNow()
  const [showDone, setShowDone] = useState(false)
  const items = buildChecklist(data, window.location.origin)
  const todo = items.filter((i) => !i.ok)
  const done = items.filter((i) => i.ok)
  const pct = Math.round((done.length / items.length) * 100)

  return (
    <section className="admin-card admin-checklist-card" aria-busy={loading}>
      <div className="admin-card-header">
        <div>
          <h2 className="admin-card-title">Setup checklist</h2>
          <p className="admin-hint">
            {done.length} of {items.length} done{checkedAt ? `, checked ${ago(checkedAt, now)}` : ''}
          </p>
        </div>
        <button type="button" className="admin-btn-ghost admin-btn-icon-text" onClick={onRecheck} disabled={loading}>
          <RefreshCw size={15} className={loading ? 'admin-spin' : ''} aria-hidden="true" />
          {loading ? 'Checking…' : 'Re-check'}
        </button>
      </div>
      <div className="admin-progress" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Setup progress">
        <i style={{ width: `${pct}%` }} />
      </div>

      {todo.length === 0 && <p className="admin-ok admin-all-done"><Check size={16} aria-hidden="true" /> Everything is set up.</p>}

      <ul className="admin-checklist">
        {todo.map((i) => (
          <li key={i.id}>
            <button type="button" className="admin-check-row" onClick={() => go(i.tab, i.field)}>
              <span className="admin-check-ring" aria-hidden="true" />
              <span className="admin-check-text">
                <strong>{i.title}</strong>
                <span className="admin-hint">{i.detail}</span>
              </span>
              <span className="admin-check-fix">Fix <ChevronRight size={15} aria-hidden="true" /></span>
            </button>
          </li>
        ))}
      </ul>

      {done.length > 0 && (
        <>
          <button type="button" className="admin-disclosure" onClick={() => setShowDone((v) => !v)} aria-expanded={showDone}>
            <ChevronDown size={15} aria-hidden="true" className={showDone ? 'is-open' : ''} />
            {showDone ? 'Hide' : 'Show'} {done.length} done
          </button>
          {showDone && (
            <ul className="admin-checklist is-done">
              {done.map((i) => (
                <li key={i.id} className="admin-check-done">
                  <Check size={16} aria-hidden="true" />
                  <span>{i.title}</span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  )
}

function PulsePanel({ settings }) {
  const [state, setState] = useState({ loading: true, monitors: [], error: null })
  const [nonce, setNonce] = useState(0)
  const [page, setPage] = useState(1)
  useEffect(() => {
    const again = () => setNonce((n) => n + 1)
    window.addEventListener('admin:refresh-health', again)
    return () => window.removeEventListener('admin:refresh-health', again)
  }, [])
  const api = String(settings.pulseApiUrl || '').replace(/\/$/, '')
  const token = String(settings.pulseStatusToken || '').trim()

  useEffect(() => {
    if (!api || !token) return
    let off = false
    const ctl = new AbortController()
    const timer = setTimeout(() => ctl.abort(), 15000)
    setState((s) => ({ ...s, loading: true, error: null }))
    fetch(`${api}/api/public/status-pages/${encodeURIComponent(token)}`, { signal: ctl.signal, cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`Pulse answered ${r.status}`))))
      .then((b) => !off && setState({ loading: false, monitors: b.monitors || [], error: null }))
      .catch((e) => !off && setState({ loading: false, monitors: [], error: e.name === 'AbortError' ? 'Pulse took too long to answer. It may be waking up, so try again in a moment.' : `${e.message}. Check the Pulse API URL, the token and Pulse's CORS_ORIGIN.` }))
      .finally(() => clearTimeout(timer))
    return () => {
      off = true
      ctl.abort()
    }
  }, [api, token, nonce])

  const up = state.monitors.filter((m) => m.current_status === 'up').length
  const paged = paginate(state.monitors, page, 8)
  const host = (u) => String(u || '').replace(/^https?:\/\//, '').replace(/\/$/, '')

  return (
    <section className="admin-card" id="site-health">
      <div className="admin-card-header">
        <div>
          <h2 className="admin-card-title">Site health</h2>
          <p className="admin-hint">
            {!api || !token ? 'From Pulse' : state.loading ? 'Asking Pulse…' : state.error ? 'From Pulse' : `${up} of ${state.monitors.length} up, from Pulse`}
          </p>
        </div>
        {api && token && (
          <button type="button" className="admin-icon-btn" onClick={() => setNonce((n) => n + 1)} disabled={state.loading} aria-label="Refresh site health">
            <RefreshCw size={16} className={state.loading ? 'admin-spin' : ''} aria-hidden="true" />
          </button>
        )}
      </div>
      {!api || !token ? (
        <p className="admin-hint">Not connected. Add the Pulse API URL and token in Site settings to see your sites here.</p>
      ) : state.error ? (
        <p className="admin-error">{state.error}</p>
      ) : state.loading && !state.monitors.length ? (
        <ul className="admin-monitors" aria-hidden="true">
          {[0, 1, 2].map((i) => <li key={i} className="admin-skeleton" />)}
        </ul>
      ) : !state.monitors.length ? (
        <p className="admin-hint">The status page has no monitors yet.</p>
      ) : (
        <>
        <ul className="admin-monitors">
          {paged.items.map((m) => (
            <li key={m.id || m.url}>
              <span className={`admin-status-dot is-${m.current_status}`} title={m.current_status} aria-label={m.current_status} />
              <span className="admin-monitor-name">
                <strong>{m.name || host(m.url)}</strong>
                <a href={m.url} target="_blank" rel="noreferrer" className="admin-hint">{host(m.url)}</a>
              </span>
              <span className="admin-monitor-stats">
                <span>{m.last_response_ms != null ? `${m.last_response_ms} ms` : 'n/a'}</span>
                <span className="admin-hint">{m.uptime?.['30d'] != null ? `${m.uptime['30d']}% · 30d` : ''}</span>
              </span>
            </li>
          ))}
        </ul>
        <Pager p={paged} onPage={setPage} label="monitors" />
        </>
      )}
    </section>
  )
}

function Backup({ data, onChanged }) {
  const { toast, confirm } = useAdmin()
  const [plan, setPlan] = useState(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(null)
  const [error, setError] = useState(null)
  const fileRef = useRef(null)

  async function download() {
    const blob = new Blob([JSON.stringify({ app: 'portfolio-admin-backup', version: 1, exportedAt: new Date().toISOString(), content: data }, null, 2)], { type: 'application/json' })
    try {
      const how = await saveFile(`portfolio-backup-${new Date().toISOString().slice(0, 10)}.json`, blob)
      toast(how === 'shared' ? 'Backup ready to save' : 'Backup downloaded')
    } catch (err) {
      toast(err.message || 'Could not save the backup', { tone: 'error' })
    }
  }

  async function pick(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setError(null)
    setMessage(null)
    try {
      const parsed = JSON.parse(await file.text())
      if (parsed.app !== 'portfolio-admin-backup' || !parsed.content) throw new Error('That is not a backup file from this admin.')
      const rows = CONTENT_TYPES.filter((t) => parsed.content[t] !== undefined).map((t) => ({
        type: t,
        now: countOf(t, data[t]),
        incoming: countOf(t, parsed.content[t]),
        merged: countOf(t, mergeContent(t, data[t], parsed.content[t])),
      }))
      setPlan({ content: parsed.content, rows })
    } catch (err) {
      setError(err.message)
    }
  }

  async function apply(mode) {
    if (mode === 'replace') {
      const ok = await confirm({
        title: 'Replace everything with the backup?',
        body: 'Anything newer than the backup is overwritten. History can still bring it back.',
        confirmLabel: 'Replace everything',
        tone: 'danger',
        secure: true,
        secureReason: 'Replace your content with the backup',
      })
      if (!ok) return
    }
    setBusy(true)
    setError(null)
    try {
      for (const row of plan.rows) {
        const incoming = plan.content[row.type]
        const { sha } = await getContent(row.type, { optional: row.type === 'drafts' })
        const next = mode === 'replace' ? incoming : mergeContent(row.type, data[row.type], incoming)
        if (JSON.stringify(next) !== JSON.stringify(data[row.type])) await putContent(row.type, next, sha)
      }
      setPlan(null)
      setMessage('Restored. Reload the admin so every tab shows the new content.')
      onChanged()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="admin-card admin-backup">
      <div className="admin-card-header">
        <div>
          <h2 className="admin-card-title">Backup and restore</h2>
          <p className="admin-hint">All your text content. Images and your CV stay in GitHub.</p>
        </div>
      </div>
      <div className="admin-row">
        <button type="button" className="admin-btn-ghost admin-btn-icon-text" onClick={download}>
          <Download size={15} aria-hidden="true" /> Download backup
        </button>
        <button type="button" className="admin-btn-ghost admin-btn-icon-text" onClick={() => fileRef.current?.click()}>
          <Upload size={15} aria-hidden="true" /> Restore from file
        </button>
        <input ref={fileRef} type="file" accept="application/json,.json" onChange={pick} hidden />
      </div>
      {error && <p className="admin-error">{error}</p>}
      {message && (
        <p className="admin-ok">{message} <button type="button" className="admin-btn-ghost" onClick={() => window.location.reload()}>Reload admin</button></p>
      )}
      {plan && (
        <div className="admin-subcard">
          <strong>This backup contains</strong>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>Content</th><th>Now</th><th>In backup</th><th>After merge</th></tr></thead>
              <tbody>{plan.rows.map((r) => <tr key={r.type}><td>{LABELS[r.type]}</td><td>{r.now}</td><td>{r.incoming}</td><td>{r.merged}</td></tr>)}</tbody>
            </table>
          </div>
          <div className="admin-row">
            <button type="button" className="admin-btn" disabled={busy} onClick={() => apply('merge')}>{busy ? 'Working…' : 'Add what is missing (safe)'}</button>
            <button type="button" className="admin-btn-danger" disabled={busy} onClick={() => apply('replace')}>Replace everything</button>
            <button type="button" className="admin-btn-ghost" disabled={busy} onClick={() => setPlan(null)}>Cancel</button>
          </div>
        </div>
      )}
    </section>
  )
}

export default function Overview({ go }) {
  const { toast } = useAdmin()
  const { loading, data, error, checkedAt, reload } = useAllContent()

  // Re-runs the checklist with fresh data and describes what changed.
  async function check() {
    const before = data ? buildChecklist(data, window.location.origin).filter((i) => i.ok).length : null
    const fresh = await reload()
    if (!fresh) throw new Error('Could not reach GitHub. Try again in a moment.')
    const items = buildChecklist(fresh, window.location.origin)
    const after = items.filter((i) => i.ok).length
    if (before === null || after === before) return `Checked. ${after} of ${items.length} done`
    if (after > before) return `Nice, ${after - before} more done. ${after} of ${items.length}`
    return `${after} of ${items.length} done. Something needs another look`
  }

  async function recheck() {
    try {
      toast(await check())
    } catch (err) {
      toast(err.message, { tone: 'error' })
    }
  }

  // Pull to refresh in the app: checklist, counts and site health together.
  useRefresh(() => {
    window.dispatchEvent(new Event('admin:refresh-health'))
    return check()
  })

  // App icon badge: how many setup items are left.
  const todoCount = data ? buildChecklist(data, window.location.origin).filter((i) => !i.ok).length : null
  useEffect(() => {
    if (todoCount !== null) setBadge(todoCount)
  }, [todoCount])

  // The "Site health" shortcut on the app icon opens here.
  useEffect(() => {
    if (!data) return
    const params = new URLSearchParams(window.location.search)
    if (params.get('focus') !== 'health') return
    params.delete('focus')
    const qs = params.toString()
    window.history.replaceState(window.history.state, '', `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash}`)
    requestAnimationFrame(() => document.getElementById('site-health')?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }, [data])

  if (loading && !data) {
    return (
      <div className="admin-section">
        <div className="admin-stats" aria-hidden="true">{[0, 1, 2, 3].map((i) => <div key={i} className="admin-stat admin-skeleton" />)}</div>
        <div className="admin-card admin-skeleton admin-skeleton-tall" />
        <p className="admin-hint">Loading your site…</p>
      </div>
    )
  }
  if (error && !data) {
    return (
      <div className="admin-empty">
        <p className="admin-error">{error}</p>
        <button type="button" className="admin-btn" onClick={reload}>Try again</button>
      </div>
    )
  }

  const states = [...data.posts, ...data.drafts.map((d) => ({ ...d, status: 'draft' }))].map((p) => postState(p))
  const live = states.filter((s) => s === 'published').length
  const draftN = states.filter((s) => s === 'draft').length
  const sched = states.filter((s) => s === 'scheduled').length
  const hiddenProjects = data.projects.filter((p) => p.hidden).length
  const shownTestimonials = data.testimonials.filter((t) => !t.hidden).length
  const postSub = [draftN && `${draftN} draft${draftN > 1 ? 's' : ''}`, sched && `${sched} scheduled`].filter(Boolean).join(', ')

  // Real links to the tab (#posts, #projects...), so they still work in a new tab
  // or if the click handler is ever skipped.
  const stat = (n, label, sub, tab, Icon) => (
    <a
      href={`#${tab}`}
      className="admin-stat"
      data-tab={tab}
      onClick={(e) => {
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
        e.preventDefault()
        go(tab)
      }}
    >
      <span className="admin-stat-icon" aria-hidden="true"><Icon size={18} /></span>
      <strong>{n}</strong>
      <span>{label}</span>
      <em>{sub || '\u00a0'}</em>
    </a>
  )

  return (
    <div className="admin-section admin-overview">
      <div className="admin-stats">
        {stat(live, live === 1 ? 'Live post' : 'Live posts', postSub || 'No drafts waiting', 'posts', PenLine)}
        {stat(data.projects.length - hiddenProjects, 'Projects shown', hiddenProjects ? `${hiddenProjects} hidden` : 'None hidden', 'projects', FolderKanban)}
        {stat(data.skills.filter((s) => !s.hidden).length, 'Skills', null, 'skills', BarChart3)}
        {stat(shownTestimonials, 'Testimonials', data.siteSettings.showTestimonials ? 'Section on' : 'Section off', 'testimonials', MessageSquareQuote)}
      </div>

      {error && <p className="admin-error">{error}</p>}
      <div className="admin-overview-cols">
        <div className="admin-overview-col">
          <Checklist data={data} loading={loading} checkedAt={checkedAt} onRecheck={recheck} go={go} />
          <SecurityCard />
        </div>
        <div className="admin-overview-col">
          <PulsePanel settings={data.siteSettings} />
          <Backup data={data} onChanged={reload} />
        </div>
      </div>
    </div>
  )
}
