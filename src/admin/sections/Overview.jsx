import { useCallback, useEffect, useState } from 'react'
import { CONTENT_TYPES, countOf, getContent, mergeContent, putContent } from '../api.js'
import { postState } from '../../lib/postStatus.js'

const PLACEHOLDER_AUTHOR = /^client name$/i
const LABELS = { siteSettings: 'Site settings', projects: 'Projects', skills: 'Skills', testimonials: 'Testimonials', posts: 'Published posts', drafts: 'Draft posts' }

function useAllContent() {
  const [state, setState] = useState({ loading: true, data: null, error: null })
  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }))
    try {
      const entries = await Promise.all(CONTENT_TYPES.map(async (t) => [t, (await getContent(t, { optional: t === 'drafts' })).data]))
      setState({ loading: false, data: Object.fromEntries(entries), error: null })
    } catch (err) {
      setState({ loading: false, data: null, error: err.message })
    }
  }, [])
  useEffect(() => {
    load()
  }, [load])
  return { ...state, reload: load }
}

function buildChecklist(d, origin) {
  const s = d.siteSettings
  const projects = d.projects.filter((p) => !p.hidden)
  const noShot = projects.filter((p) => !p.image)
  const noAlt = projects.filter((p) => p.image && !p.imageAlt)
  const placeholders = d.testimonials.filter((t) => PLACEHOLDER_AUTHOR.test(String(t.author || '').trim()))
  const thin = d.posts.filter((p) => String(p.excerpt || '').length < 70)
  const metaLen = String(s.metaDescription || '').length
  const list = (items, key) => items.map((x) => x[key]).join(', ')
  return [
    { ok: String(s.siteUrl || '').replace(/\/$/, '') === origin, title: 'Site URL matches this address', detail: `Settings say ${s.siteUrl || 'nothing'}, you are on ${origin}. This feeds Google and link previews.`, tab: 'settings' },
    { ok: !!s.linkedinUrl, title: 'LinkedIn URL is set', detail: 'It is empty. Useful for remote job applications.', tab: 'settings' },
    { ok: !!s.formspreeId, title: 'Contact form sends to your inbox', detail: 'No Formspree ID yet, so briefs only go out by email, WhatsApp or copy.', tab: 'settings' },
    { ok: !!(s.pulseApiUrl && s.pulseStatusToken), title: 'Live status chips are connected', detail: 'Add your Pulse API URL and status page token.', tab: 'settings' },
    { ok: metaLen >= 70 && metaLen <= 160, title: 'Meta description is 70 to 160 characters', detail: `It is ${metaLen} characters.`, tab: 'settings' },
    { ok: placeholders.length === 0, title: 'Testimonials have real names', detail: `${placeholders.length} still say "Client name".`, tab: 'testimonials' },
    { ok: noShot.length === 0, title: 'Every project has a screenshot', detail: `Missing: ${list(noShot, 'name')}.`, tab: 'projects' },
    { ok: noAlt.length === 0, title: 'Screenshots have alt text', detail: `Missing on: ${list(noAlt, 'name')}.`, tab: 'projects' },
    { ok: thin.length === 0, title: 'Every post has a good summary', detail: `Too short on: ${list(thin, 'title')}.`, tab: 'posts' },
  ]
}

function PulsePanel({ settings }) {
  const [state, setState] = useState({ loading: true, monitors: [], error: null })
  const api = String(settings.pulseApiUrl || '').replace(/\/$/, '')
  const token = String(settings.pulseStatusToken || '').trim()
  useEffect(() => {
    if (!api || !token) return
    let off = false
    const ctl = new AbortController()
    const timer = setTimeout(() => ctl.abort(), 12000)
    fetch(`${api}/api/public/status-pages/${encodeURIComponent(token)}`, { signal: ctl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`Pulse answered ${r.status}`))))
      .then((b) => !off && setState({ loading: false, monitors: b.monitors || [], error: null }))
      .catch((e) => !off && setState({ loading: false, monitors: [], error: e.name === 'AbortError' ? 'Pulse took too long to answer (it may be asleep, try again).' : `${e.message}. Check the Pulse API URL, the token and Pulse's CORS_ORIGIN.` }))
      .finally(() => clearTimeout(timer))
    return () => {
      off = true
      ctl.abort()
    }
  }, [api, token])

  if (!api || !token) {
    return <p className="admin-hint">Not connected. Add the Pulse API URL and token in Site Settings to see your sites here.</p>
  }
  if (state.loading) return <p className="admin-hint">Asking Pulse…</p>
  if (state.error) return <p className="admin-error">{state.error}</p>
  if (!state.monitors.length) return <p className="admin-hint">The status page has no monitors yet.</p>
  return (
    <table className="admin-table">
      <thead><tr><th>Monitor</th><th>Status</th><th>Response</th><th>Uptime 30d</th></tr></thead>
      <tbody>
        {state.monitors.map((m) => (
          <tr key={m.id || m.url}>
            <td>{m.name || m.url}<br /><span className="admin-hint">{m.url}</span></td>
            <td><span className={`admin-pill is-${m.current_status}`}>{m.current_status}</span></td>
            <td>{m.last_response_ms != null ? `${m.last_response_ms} ms` : 'n/a'}</td>
            <td>{m.uptime?.['30d'] != null ? `${m.uptime['30d']}%` : 'n/a'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function Backup({ data, onChanged }) {
  const [plan, setPlan] = useState(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(null)
  const [error, setError] = useState(null)

  function download() {
    const blob = new Blob([JSON.stringify({ app: 'portfolio-admin-backup', version: 1, exportedAt: new Date().toISOString(), content: data }, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `portfolio-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
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
    if (mode === 'replace' && !confirm('Replace your current content with the backup? Anything newer than the backup is lost (History can still bring it back).')) return
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
    <div>
      <div className="admin-row">
        <button type="button" className="admin-btn" onClick={download}>Download backup</button>
        <label className="admin-btn-ghost admin-file">
          Restore from a backup file…
          <input type="file" accept="application/json,.json" onChange={pick} hidden />
        </label>
      </div>
      <p className="admin-hint">A backup holds all your text content (settings, projects, skills, testimonials, posts, drafts). Images and your CV file stay in GitHub.</p>
      {error && <p className="admin-error">{error}</p>}
      {message && (
        <p className="admin-ok">{message} <button type="button" className="admin-btn-ghost" onClick={() => window.location.reload()}>Reload admin</button></p>
      )}
      {plan && (
        <div className="admin-card">
          <strong>This backup contains</strong>
          <table className="admin-table">
            <thead><tr><th>Content</th><th>Now</th><th>In backup</th><th>After adding what is missing</th></tr></thead>
            <tbody>{plan.rows.map((r) => <tr key={r.type}><td>{LABELS[r.type]}</td><td>{r.now}</td><td>{r.incoming}</td><td>{r.merged}</td></tr>)}</tbody>
          </table>
          <div className="admin-row">
            <button type="button" className="admin-btn" disabled={busy} onClick={() => apply('merge')}>{busy ? 'Working…' : 'Add what is missing (safe)'}</button>
            <button type="button" className="admin-btn-danger" disabled={busy} onClick={() => apply('replace')}>Replace everything</button>
            <button type="button" className="admin-btn-ghost" disabled={busy} onClick={() => setPlan(null)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function Overview({ go }) {
  const { loading, data, error, reload } = useAllContent()
  if (loading && !data) return <p className="admin-hint">Loading your site…</p>
  if (error) return <p className="admin-error">{error}</p>

  const origin = window.location.origin
  const items = buildChecklist(data, origin)
  const done = items.filter((i) => i.ok).length
  const states = [...data.posts, ...data.drafts.map((d) => ({ ...d, status: 'draft' }))].map((p) => postState(p))
  const stat = (n, label) => (
    <div className="admin-stat"><strong>{n}</strong><span>{label}</span></div>
  )

  return (
    <div className="admin-section">
      <h2>Overview</h2>

      <div className="admin-stats">
        {stat(states.filter((s) => s === 'published').length, 'Live posts')}
        {stat(states.filter((s) => s === 'draft').length, 'Drafts')}
        {stat(states.filter((s) => s === 'scheduled').length, 'Scheduled')}
        {stat(data.projects.filter((p) => !p.hidden).length, `Projects shown${data.projects.some((p) => p.hidden) ? ` (${data.projects.filter((p) => p.hidden).length} hidden)` : ''}`)}
        {stat(data.skills.filter((s) => !s.hidden).length, 'Skills')}
      </div>

      <div className="admin-card">
        <div className="admin-card-header">
          <strong>Setup checklist: {done} of {items.length} done</strong>
          <button type="button" className="admin-btn-ghost" onClick={reload}>Re-check</button>
        </div>
        <div className="admin-progress"><i style={{ width: `${(done / items.length) * 100}%` }} /></div>
        <ul className="admin-checklist">
          {items.map((i) => (
            <li key={i.title} className={i.ok ? 'ok' : 'todo'}>
              <span className="admin-check" aria-hidden="true">{i.ok ? '✓' : '○'}</span>
              <div>
                <strong>{i.title}</strong>
                {!i.ok && <span className="admin-hint">{i.detail}</span>}
              </div>
              {!i.ok && <button type="button" className="admin-btn-ghost" onClick={() => go(i.tab)}>Fix</button>}
            </li>
          ))}
        </ul>
      </div>

      <div className="admin-card">
        <div className="admin-card-header"><strong>Site health (from Pulse)</strong></div>
        <PulsePanel settings={data.siteSettings} />
      </div>

      <div className="admin-card">
        <div className="admin-card-header"><strong>Backup and restore</strong></div>
        <Backup data={data} onChanged={reload} />
      </div>
    </div>
  )
}
