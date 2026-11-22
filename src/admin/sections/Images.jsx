import { useCallback, useEffect, useRef, useState } from 'react'
import { ImageOff, Lock, RefreshCw, Trash2 } from 'lucide-react'
import { adminFetch } from '../http.js'
import { agoText, readCache, writeCache } from '../cache.js'
import { useOnRetry } from '../network.js'
import { useAdmin, useRefresh } from '../AdminContext.jsx'
import { prettySize } from '../imageUpload.js'
import { openInApp } from '../native.js'
import Pager, { paginate } from '../Pager.jsx'

// Every image you uploaded, which ones your content uses, and a safe way to delete the
// rest. The server decides what may be deleted (see api/_lib/imageLibrary.js): only
// images this admin uploaded, not used anywhere, and not uploaded in the last 24 hours.
// Deleting removes them from the repo in a single commit, so the site rebuilds once.

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'unused', label: 'Unused' },
  { id: 'used', label: 'In use' },
]
const BADGE = {
  used: { cls: 'is-published', text: 'In use' },
  unused: { cls: 'is-warn', text: 'Unused' },
  recent: { cls: 'is-accent', text: 'New' },
  site: { cls: '', text: 'Site' },
}
const PAGE_SIZE = 10

async function fetchLibrary() {
  const res = await adminFetch('/api/admin/upload', { cache: 'no-store' })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.error || 'Could not load your images.')
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

// A picture that has just been uploaded is not on the live site until the rebuild is
// done, so a failed thumbnail shows a placeholder instead of a broken-image icon.
function Thumb({ src }) {
  const [failed, setFailed] = useState(false)
  return failed ? <ImageOff size={18} aria-hidden="true" /> : <img src={src} alt="" loading="lazy" decoding="async" onError={() => setFailed(true)} />
}

function detailLine(img) {
  if (img.state === 'used') return `Used in ${img.usedBy.join(', ')}`
  if (img.state === 'recent') return 'Uploaded recently. Kept for 24 hours in case you have not saved it yet.'
  if (img.state === 'site') return 'Part of the site. Cannot be deleted here.'
  return 'Not used anywhere'
}

export default function Images() {
  const { toast, confirm } = useAdmin()
  const cached = useRef(readCache('images'))
  const [state, setState] = useState(() => ({ loading: true, error: null, data: cached.current?.value || null, at: cached.current?.at || null }))
  const [filter, setFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState(() => new Set())
  const [busy, setBusy] = useState(false)
  const loading = useRef(false)
  const now = useNow()

  const load = useCallback(async () => {
    if (loading.current) return
    loading.current = true
    setState((s) => ({ ...s, loading: true, error: null }))
    try {
      const data = await fetchLibrary()
      writeCache('images', data)
      setState({ loading: false, error: null, data, at: Date.now() })
      // Forget selections that no longer exist or are no longer deletable.
      const ok = new Set(data.images.filter((i) => i.deletable).map((i) => i.path))
      setSelected((sel) => new Set([...sel].filter((p) => ok.has(p))))
    } catch (err) {
      setState((s) => ({ ...s, loading: false, error: err.message }))
    } finally {
      loading.current = false
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
  const all = data?.images || []
  const shown = all.filter((i) => (filter === 'unused' ? i.state === 'unused' : filter === 'used' ? i.state === 'used' : true))
  const paged = paginate(shown, page, PAGE_SIZE)
  const deletable = all.filter((i) => i.deletable)
  const chosen = all.filter((i) => selected.has(i.path))
  const chosenBytes = chosen.reduce((n, i) => n + i.size, 0)
  const s = data?.summary

  const toggle = (path) =>
    setSelected((sel) => {
      const next = new Set(sel)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })

  async function remove() {
    if (!chosen.length || busy) return
    const n = chosen.length
    const ok = await confirm({
      title: `Delete ${n} unused image${n === 1 ? '' : 's'}?`,
      body: `They are removed from the repo and free ${prettySize(chosenBytes)}. Git keeps the old copies, so you can still get one back from GitHub's history. The site rebuilds once.`,
      confirmLabel: 'Delete',
      tone: 'danger',
    })
    if (!ok) return
    setBusy(true)
    try {
      const res = await adminFetch('/api/admin/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ delete: chosen.map((i) => i.path) }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || 'Could not delete.')
      const skipped = body.refused?.length || 0
      if (body.deleted?.length) toast(`Deleted ${body.deleted.length} image${body.deleted.length === 1 ? '' : 's'}${skipped ? `, kept ${skipped}` : ''}`)
      if (skipped) toast(body.refused[0].reason, { tone: 'error', duration: 6000 })
      setSelected(new Set())
      await load()
    } catch (err) {
      toast(err.message, { tone: 'error', duration: 6000 })
    } finally {
      setBusy(false)
    }
  }

  const hint = state.loading
    ? data
      ? `Updated ${agoText(state.at, now)}, updating…`
      : 'Reading your repo…'
    : state.error && data
      ? `Could not update, showing ${agoText(state.at, now)}`
      : s
        ? `${s.total} image${s.total === 1 ? '' : 's'} · ${prettySize(s.totalBytes)}${s.unused ? ` · ${s.unused} unused (${prettySize(s.unusedBytes)})` : ''}`
        : ''

  return (
    <section className="admin-card" aria-busy={state.loading}>
      <div className="admin-card-header">
        <div>
          <h2 className="admin-card-title">Images</h2>
          <p className="admin-hint">{hint}</p>
        </div>
        <button type="button" className="admin-icon-btn" onClick={load} disabled={state.loading} aria-label="Refresh images">
          <RefreshCw size={16} className={state.loading ? 'admin-spin' : ''} aria-hidden="true" />
        </button>
      </div>

      {state.error && !data && <p className="admin-error">{state.error}</p>}
      {state.error && data && <p className="admin-error admin-stale-error">{state.error}</p>}

      {data && all.length > 0 && (
        <div className="admin-lib-bar">
          <span className="admin-seg" role="group" aria-label="Show">
            {FILTERS.map((f) => (
              <button key={f.id} type="button" className={filter === f.id ? 'on' : ''} aria-pressed={filter === f.id} onClick={() => { setFilter(f.id); setPage(1) }}>
                {f.label}
              </button>
            ))}
          </span>
          {deletable.length > 0 && (
            <button
              type="button"
              className="admin-btn-ghost"
              onClick={() => setSelected(selected.size === deletable.length ? new Set() : new Set(deletable.map((i) => i.path)))}
            >
              {selected.size === deletable.length ? 'Clear selection' : `Select all unused (${deletable.length})`}
            </button>
          )}
        </div>
      )}

      {chosen.length > 0 && (
        <div className="admin-lib-bar admin-lib-selection">
          <span className="admin-hint">{chosen.length} selected · {prettySize(chosenBytes)}</span>
          <button type="button" className="admin-btn-danger admin-btn-icon-text" onClick={remove} disabled={busy}>
            <Trash2 size={15} aria-hidden="true" /> {busy ? 'Deleting…' : `Delete ${chosen.length}`}
          </button>
        </div>
      )}

      {!data && state.loading && (
        <ul className="admin-lib-list" aria-hidden="true">
          {[0, 1, 2, 3].map((i) => <li key={i} className="admin-skeleton admin-activity-skeleton" />)}
        </ul>
      )}

      {data && !all.length && <p className="admin-hint">No images in the repo yet. Pictures you upload from a project, post or your profile show up here.</p>}
      {data && all.length > 0 && !shown.length && <p className="admin-hint">{filter === 'unused' ? 'Nothing unused. Every image is in use.' : 'Nothing to show.'}</p>}

      {shown.length > 0 && (
        <>
          <ul className="admin-lib-list">
            {paged.items.map((img) => {
              const badge = BADGE[img.state]
              return (
                <li key={img.path} className={`is-${img.state}`}>
                  <a
                    className="admin-lib-thumb"
                    href={img.path}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Open ${img.name}`}
                    onClick={(e) => {
                      if (window.Capacitor?.isNativePlatform?.()) {
                        e.preventDefault()
                        openInApp(img.path)
                      }
                    }}
                  >
                    <Thumb src={img.path} />
                  </a>
                  <span className="admin-lib-text">
                    <strong title={img.name}>{img.name}</strong>
                    <span className="admin-hint">
                      {[img.folder, prettySize(img.size), img.uploadedAt ? agoText(Date.parse(img.uploadedAt), now) : null].filter(Boolean).join(' · ')}
                    </span>
                    <span className="admin-hint">{detailLine(img)}</span>
                  </span>
                  <span className="admin-lib-side">
                    <span className={`admin-badge ${badge.cls}`}>{badge.text}</span>
                    {img.deletable ? (
                      <input type="checkbox" className="admin-lib-check" checked={selected.has(img.path)} onChange={() => toggle(img.path)} aria-label={`Select ${img.name} to delete`} />
                    ) : (
                      <Lock size={14} className="admin-lib-lock" aria-label="Cannot be deleted" />
                    )}
                  </span>
                </li>
              )
            })}
          </ul>
          <Pager p={paged} onPage={setPage} label="images" />
        </>
      )}
    </section>
  )
}
