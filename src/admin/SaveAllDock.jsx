import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, Check, ChevronUp, Loader2, RotateCcw } from 'lucide-react'
import { useAdmin } from './AdminContext.jsx'
import useDeployStatus from './useDeployStatus.js'
import { haptic } from './native.js'

const names = (list, labels) => list.map((t) => labels[t.id] || t.id)
const sentence = (arr) => (arr.length < 3 ? arr.join(' and ') : `${arr.slice(0, -1).join(', ')} and ${arr[arr.length - 1]}`)

// Where every tab stands, read from what each editor reported.
function useTabStatus() {
  const { tabs } = useAdmin()
  const list = [...tabs.values()]
  const dirty = list.filter((t) => t.dirty)
  return {
    list,
    dirty,
    blocked: dirty.filter((t) => t.blocked),
    saving: list.filter((t) => t.saving),
    problems: list.filter((t) => t.error || t.conflict),
    latestSave: list.filter((t) => t.savedAt && t.commit).sort((a, b) => b.savedAt - a.savedAt)[0] || null,
  }
}

// A small chip that is on every tab (in the header): saved, unsaved, saving, a
// problem, rebuilding or live. Tap it to jump to the tab that needs you.
export function AdminStatusChip({ labels, go, tab }) {
  const s = useTabStatus()
  const deploy = useDeployStatus(s.latestSave && !s.dirty.length ? s.latestSave.commit : null)

  let tone = 'ok', text = 'All saved', title = 'Everything is saved', target = null, busy = false
  if (s.saving.length) {
    tone = 'busy'; text = 'Saving…'; title = 'Saving to GitHub'; busy = true
  } else if (s.problems.length) {
    const t = s.problems[0]
    tone = 'bad'; text = 'Needs attention'; title = `${labels[t.id] || t.id}: ${t.error || 'changed somewhere else'}`; target = t.id
  } else if (s.dirty.length) {
    const t = s.dirty.find((x) => x.id === tab) || s.dirty[0]
    tone = 'warn'
    text = s.dirty.length > 1 ? `${s.dirty.length} unsaved` : 'Unsaved'
    title = `Unsaved changes in ${sentence(names(s.dirty, labels))}`
    target = t.id
  } else if (s.latestSave && deploy === 'deploying') {
    tone = 'busy'; text = 'Rebuilding'; title = 'Saved. The site is rebuilding, usually under a minute'; busy = true
  } else if (s.latestSave && deploy === 'live') {
    text = 'Live'; title = 'Your last save is live on the site'
  }

  const body = (
    <>
      {busy ? <Loader2 size={13} className="admin-spin" aria-hidden="true" /> : <i className="admin-chip-dot" aria-hidden="true" />}
      <span>{text}</span>
    </>
  )
  return target ? (
    <button type="button" className={`admin-status is-${tone}`} title={title} onClick={() => go(target)}>{body}</button>
  ) : (
    <span className={`admin-status is-${tone}`} title={title} role="status">{body}</span>
  )
}

// The dock at the bottom of every tab. It appears when anything is unsaved, saving,
// or went wrong, and saves or discards every tab at once.
export default function SaveAllDock({ labels, go }) {
  const { confirm, tabs } = useAdmin()
  const s = useTabStatus()
  const [running, setRunning] = useState(false)
  const [open, setOpen] = useState(false)
  const [attention, setAttention] = useState([]) // tabs the last Save all could not save
  const [justSaved, setJustSaved] = useState(false)
  const seenSave = useRef(0)

  const saving = running || s.saving.length > 0
  const saveable = s.dirty.filter((t) => !t.blocked && !t.saving)
  const many = s.dirty.length > 1

  // Hold the dock for a moment after a save so the confirmation is seen.
  const newest = s.list.reduce((m, t) => Math.max(m, t.savedAt || 0), 0)
  useEffect(() => {
    if (!newest || newest === seenSave.current) return
    seenSave.current = newest
    setJustSaved(true)
    const t = setTimeout(() => setJustSaved(false), 2600)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newest])

  // Rows for tabs that no longer need attention disappear on their own.
  const needs = s.dirty.length > 0 || s.problems.length > 0
  useEffect(() => {
    if (!needs) {
      setOpen(false)
      setAttention([])
    }
  }, [needs])

  const showDock = s.dirty.length > 0 || saving || s.problems.length > 0 || (justSaved && !s.dirty.length)
  const hasProblem = s.problems.length > 0 || (s.blocked.length > 0 && !saving)

  async function saveAll() {
    if (running) return
    setRunning(true)
    setAttention([])
    const failed = []
    for (const t of saveable) {
      const live = tabs.get(t.id) || t // always the latest save for that tab
      let ok = false
      try {
        ok = (await live.save()) !== false
      } catch {
        ok = false
      }
      if (!ok) failed.push(t.id)
    }
    setRunning(false)
    if (saveable.length) (failed.length === saveable.length ? haptic.error : haptic.success)()
    const skipped = s.blocked.map((t) => t.id)
    if (failed.length || skipped.length) {
      setAttention([...failed, ...skipped])
      setOpen(true)
    }
  }

  // Ctrl+S (Cmd+S on a Mac) saves everything that has unsaved edits.
  const saveRef = useRef(saveAll)
  saveRef.current = saveAll
  const canSave = saveable.length > 0 && !saving
  useEffect(() => {
    function onKey(e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        if (canSave) saveRef.current()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [canSave])

  async function discardAll() {
    const ok = await confirm({
      title: many ? 'Discard changes on every tab?' : 'Discard your changes?',
      body: many
        ? `Everything you changed since the last save in ${sentence(names(s.dirty, labels))} goes back to how it was.`
        : 'Everything you changed on this tab since the last save goes back to how it was.',
      confirmLabel: 'Discard changes',
      cancelLabel: 'Keep editing',
      tone: 'danger',
    })
    if (ok) s.dirty.forEach((t) => t.discard?.())
  }

  async function discardOne(t) {
    const ok = await confirm({
      title: `Discard changes in ${labels[t.id] || t.id}?`,
      body: 'Everything you changed on this tab since the last save goes back to how it was.',
      confirmLabel: 'Discard changes',
      cancelLabel: 'Keep editing',
      tone: 'danger',
    })
    if (ok) t.discard?.()
  }

  async function loadLatest(t) {
    const ok = await confirm({
      title: 'Load the latest version?',
      body: `Your unsaved edits in ${labels[t.id] || t.id} are replaced with what is saved on GitHub now.`,
      confirmLabel: 'Load latest',
      tone: 'danger',
    })
    if (ok) t.reload?.()
  }

  // What the dock says, in order of importance.
  let status
  if (saving) {
    status = (<><Loader2 size={16} className="admin-spin" aria-hidden="true" /> Saving to GitHub…</>)
  } else if (s.problems.length) {
    const t = s.problems[0]
    status = (<><AlertTriangle size={16} aria-hidden="true" /> <span className="admin-dock-msg">{many || s.problems.length > 1 ? `${labels[t.id] || t.id}: ` : ''}{t.error || 'This tab was changed somewhere else.'}</span></>)
  } else if (s.blocked.length && s.blocked.length === s.dirty.length) {
    const n = s.blocked.reduce((sum, t) => sum + t.errors.length, 0)
    status = (<><AlertTriangle size={16} aria-hidden="true" /> {n === 1 ? '1 thing to fix before saving' : `${n} things to fix before saving`}</>)
  } else if (s.dirty.length) {
    const where = s.dirty.map((t) => labels[t.id] || t.id)
    const restored = s.dirty.some((t) => t.restored)
    status = (
      <span className="admin-dock-msg">
        {restored && !many ? 'Older version loaded. Check it, then save.' : many ? `Unsaved changes in ${sentence(where)}` : `Unsaved changes in ${where[0]}`}
        {s.blocked.length > 0 && ` (${sentence(names(s.blocked, labels))} needs fixing)`}
      </span>
    )
  } else if (justSaved) {
    status = (<><Check size={16} aria-hidden="true" /> All saved</>)
  }

  const expandable = many || s.blocked.length > 0 || s.problems.length > 0 || attention.length > 0
  const rows = s.list.filter((t) => t.dirty || t.error || t.conflict)

  return (
    <div className={`admin-dock ${showDock ? 'is-shown' : ''} ${hasProblem ? 'is-problem' : ''}`} aria-hidden={!showDock}>
      {open && expandable && (
        <ul className="admin-dock-rows">
          {rows.map((t) => (
            <li key={t.id} className={`admin-dock-row ${t.blocked || t.error ? 'is-bad' : ''} ${attention.includes(t.id) ? 'is-attention' : ''}`}>
              <div className="admin-dock-row-head">
                <strong>{labels[t.id] || t.id}</strong>
                <span className="admin-dock-row-state">
                  {t.saving ? 'Saving…' : t.error ? t.error : t.blocked ? 'Needs fixing before it can save' : t.dirty ? 'Unsaved changes' : 'Changed somewhere else'}
                </span>
                <span className="admin-spacer" />
                <button type="button" className="admin-btn-ghost" onClick={() => go(t.id)}>Open</button>
                {t.conflict && t.reload && (
                  <button type="button" className="admin-btn-ghost admin-btn-icon-text" onClick={() => loadLatest(t)}>
                    <RotateCcw size={14} aria-hidden="true" /> Load latest
                  </button>
                )}
                {t.dirty && t.discard && !t.saving && <button type="button" className="admin-btn-ghost" onClick={() => discardOne(t)}>Discard</button>}
                {t.dirty && !t.blocked && !t.saving && <button type="button" className="admin-btn" onClick={() => t.save()} disabled={running}>Save</button>}
              </div>
              {t.blocked && t.dirty && (
                <ul className="admin-problems" role="alert">
                  {t.errors.map((e) => <li key={e}>{e}</li>)}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
      <div className="admin-dock-inner">
        {expandable ? (
          <button type="button" className="admin-dock-status admin-dock-toggle" onClick={() => setOpen((v) => !v)} aria-expanded={open} tabIndex={showDock ? 0 : -1}>
            {status}
            <ChevronUp size={16} className={`admin-dock-chevron ${open ? 'is-open' : ''}`} aria-hidden="true" />
          </button>
        ) : (
          <div className="admin-dock-status" role="status" aria-live="polite">{status}</div>
        )}
        <div className="admin-dock-actions">
          {s.dirty.some((t) => t.discard) && !saving && (
            <button type="button" className="admin-btn-ghost" tabIndex={showDock ? 0 : -1} onClick={discardAll}>
              {many ? 'Discard all' : 'Discard'}
            </button>
          )}
          {(s.dirty.length > 0 || saving) && (
            <button type="button" className="admin-btn" tabIndex={showDock ? 0 : -1} onClick={saveAll} disabled={!canSave} title="Save (Ctrl+S)">
              {saving ? 'Saving…' : many ? `Save all (${saveable.length})` : 'Save changes'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
