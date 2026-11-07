import { useEffect, useRef, useState } from 'react'
import { Check, History, Loader2, AlertTriangle, RotateCcw } from 'lucide-react'
import HistoryPanel from './HistoryPanel.jsx'
import useDeployStatus from './useDeployStatus.js'
import { useAdmin, usePanel } from './AdminContext.jsx'

// Each editor renders one SaveBar. It has two parts:
// - a slim toolbar at the top: History, and where the last save has got to
//   (rebuilding, live);
// - a dock that slides up from the bottom of the screen whenever there is
//   something to act on: unsaved edits (Discard / Save), a save in progress,
//   a problem that blocks saving, or a save that just finished.
// Ctrl+S (Cmd+S on a Mac) saves the tab you are looking at.
export default function SaveBar({
  saving, error, savedAt, onSave, dirty, onDiscard = null,
  errors = [], conflict = false, onReload, commit = null, type = null, onRestore = null, restoredFrom = null,
}) {
  const [showHistory, setShowHistory] = useState(false)
  const [justSaved, setJustSaved] = useState(false)
  const [showProblems, setShowProblems] = useState(false)
  const deploy = useDeployStatus(savedAt ? commit : null)
  const { active } = usePanel()
  const { confirm } = useAdmin()
  const blocked = errors.length > 0
  const canSave = dirty && !saving && !blocked

  // Keep the dock up for a moment after a save so the confirmation is seen.
  useEffect(() => {
    if (!savedAt) return
    setJustSaved(true)
    const t = setTimeout(() => setJustSaved(false), 2600)
    return () => clearTimeout(t)
  }, [savedAt])

  const save = useRef(onSave)
  save.current = onSave
  useEffect(() => {
    if (!active) return
    function onKey(e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        if (canSave) save.current()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active, canSave])

  const showDock = dirty || saving || !!error || (justSaved && !dirty)

  let deployText = null
  if (savedAt && !dirty) {
    if (deploy === 'live') deployText = 'Live on your site'
    else if (deploy === 'deploying') deployText = 'Saved. Site rebuilding, usually under a minute'
    else deployText = 'Saved. The site updates within a minute or two'
  }

  return (
    <>
      <div className="admin-toolbar">
        {type && onRestore && (
          <button type="button" className="admin-btn-ghost admin-btn-icon-text" onClick={() => setShowHistory(true)}>
            <History size={15} aria-hidden="true" /> History
          </button>
        )}
        {deployText && (
          <span className={`admin-deploy is-${deploy}`}>
            {deploy === 'live' ? <Check size={14} aria-hidden="true" /> : <span className="admin-pulse-dot" aria-hidden="true" />}
            {deployText}
          </span>
        )}
      </div>

      <div className={`admin-dock ${showDock ? 'is-shown' : ''} ${error || (blocked && dirty) ? 'is-problem' : ''}`} aria-hidden={!showDock}>
        <div className="admin-dock-inner">
          <div className="admin-dock-status" role="status" aria-live="polite">
            {saving && (<><Loader2 size={16} className="admin-spin" aria-hidden="true" /> Saving to GitHub…</>)}
            {!saving && error && (<><AlertTriangle size={16} aria-hidden="true" /> <span className="admin-dock-msg">{error}</span></>)}
            {!saving && !error && dirty && blocked && (
              <button type="button" className="admin-dock-problems-toggle" onClick={() => setShowProblems((v) => !v)} aria-expanded={showProblems}>
                <AlertTriangle size={16} aria-hidden="true" />
                {errors.length === 1 ? '1 thing to fix before saving' : `${errors.length} things to fix before saving`}
              </button>
            )}
            {!saving && !error && dirty && !blocked && (
              <span className="admin-dock-msg">{restoredFrom ? 'Older version loaded. Check it, then save.' : 'Unsaved changes'}</span>
            )}
            {!saving && !error && !dirty && justSaved && (<><Check size={16} aria-hidden="true" /> Saved</>)}
          </div>
          <div className="admin-dock-actions">
            {conflict && onReload && (
              <button
                type="button"
                className="admin-btn-ghost"
                tabIndex={showDock ? 0 : -1}
                onClick={async () => {
                  const ok = await confirm({
                    title: 'Load the latest version?',
                    body: 'Your unsaved edits on this tab are replaced with what is saved on GitHub now.',
                    confirmLabel: 'Load latest',
                    tone: 'danger',
                  })
                  if (ok) onReload()
                }}
              >
                <RotateCcw size={14} aria-hidden="true" /> Load latest
              </button>
            )}
            {dirty && onDiscard && !saving && (
              <button
                type="button"
                className="admin-btn-ghost"
                tabIndex={showDock ? 0 : -1}
                onClick={async () => {
                  const ok = await confirm({
                    title: 'Discard your changes?',
                    body: 'Everything you changed on this tab since the last save goes back to how it was.',
                    confirmLabel: 'Discard changes',
                    cancelLabel: 'Keep editing',
                    tone: 'danger',
                  })
                  if (ok) onDiscard()
                }}
              >
                Discard
              </button>
            )}
            {(dirty || saving) && (
              <button type="button" className="admin-btn" tabIndex={showDock ? 0 : -1} onClick={onSave} disabled={!canSave} title="Save (Ctrl+S)">
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            )}
          </div>
        </div>
        {blocked && dirty && showProblems && (
          <ul className="admin-problems" role="alert">
            {errors.map((e) => <li key={e}>{e}</li>)}
          </ul>
        )}
      </div>

      {showHistory && (
        <HistoryPanel type={type} onRestore={onRestore} onClose={() => setShowHistory(false)} />
      )}
    </>
  )
}
