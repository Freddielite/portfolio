import { adminFetch } from './http.js'
import { useEffect, useState } from 'react'

const when = (iso) =>
  iso ? new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''

// Lists recent saves of one content file (each save is a git commit). "Load this
// version" puts it into the editor as an unsaved change, so nothing is
// overwritten until you review it and press Save.
export default function HistoryPanel({ type, onRestore, onClose }) {
  const [commits, setCommits] = useState(null)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(null)

  useEffect(() => {
    let off = false
    adminFetch(`/api/admin/history?type=${type}`)
      .then((r) => r.json().then((b) => ({ ok: r.ok, b })))
      .then(({ ok, b }) => {
        if (off) return
        if (!ok) setError(b.error || 'Could not load history.')
        else setCommits(b.commits)
      })
      .catch((e) => !off && setError(e.message))
    return () => {
      off = true
    }
  }, [type])

  async function load(c) {
    setBusy(c.sha)
    setError(null)
    try {
      const res = await adminFetch(`/api/admin/history?type=${type}&ref=${c.sha}`)
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || 'Could not load that version.')
      onRestore(body.data, c)
      onClose()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="admin-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="admin-modal" role="dialog" aria-modal="true" aria-label="Change history">
        <div className="admin-card-header">
          <strong>Change history</strong>
          <button type="button" className="admin-btn-ghost" onClick={onClose}>Close</button>
        </div>
        <p className="admin-hint">Every save is stored on GitHub. Load an older version into the editor, check it, then press Save to bring it back.</p>
        {error && <p className="admin-error">{error}</p>}
        {!commits && !error && <p className="admin-hint">Loading…</p>}
        {commits && commits.length === 0 && <p className="admin-hint">No history yet.</p>}
        <ul className="admin-history">
          {(commits || []).map((c, i) => (
            <li key={c.sha}>
              <div>
                <strong>{c.message}</strong>
                <span className="admin-hint">{when(c.date)}{c.author ? ` · ${c.author}` : ''}{i === 0 ? ' · current' : ''}</span>
              </div>
              <button type="button" className="admin-btn-ghost" disabled={busy === c.sha || i === 0} onClick={() => load(c)}>
                {busy === c.sha ? 'Loading…' : 'Load this version'}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
