import { useEffect, useRef, useState } from 'react'
import { Check, History } from 'lucide-react'
import HistoryPanel from './HistoryPanel.jsx'
import useDeployStatus from './useDeployStatus.js'
import { useAdmin, usePanel } from './AdminContext.jsx'

// Each editor renders one SaveBar. On the tab itself it is only a slim toolbar:
// History, and where the last save has got to (rebuilding, live).
// Saving, discarding and problems are handled by the Save all dock and the status
// chip (SaveAllDock.jsx), which are on every tab. The SaveBar's other job is to
// tell them where this tab stands and what Save and Discard do for it.
export default function SaveBar({
  saving, error, savedAt, onSave, dirty, onDiscard = null,
  errors = [], conflict = false, onReload, commit = null, type = null, onRestore = null, restoredFrom = null,
}) {
  const [showHistory, setShowHistory] = useState(false)
  const deploy = useDeployStatus(savedAt ? commit : null)
  const { id } = usePanel()
  const { publishTab, dropTab } = useAdmin()

  // Report on every render so the dock always calls the latest save and discard
  // (they close over the tab's current edits). The context only re-renders the
  // dock when something it shows has changed.
  const info = {
    id, dirty: !!dirty, saving: !!saving, error: error || null, errors, blocked: errors.length > 0,
    conflict: !!conflict, savedAt: savedAt || null, commit, restored: !!restoredFrom,
    save: onSave, discard: onDiscard, reload: onReload,
  }
  const latest = useRef(info)
  latest.current = info
  useEffect(() => {
    if (id) publishTab(id, latest.current)
  })
  useEffect(() => () => id && dropTab(id), [id, dropTab])

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

      {showHistory && (
        <HistoryPanel type={type} onRestore={onRestore} onClose={() => setShowHistory(false)} />
      )}
    </>
  )
}
