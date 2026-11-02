import { useState } from 'react'
import HistoryPanel from './HistoryPanel.jsx'
import useDeployStatus from './useDeployStatus.js'

// The bar at the top and bottom of every editor: Save, what is wrong (if
// anything), and where the change has got to (saved, deploying, live).
// `errors` blocks saving. `type` + `onRestore` add the History button.
export default function SaveBar({
  saving, error, savedAt, onSave, dirty,
  errors = [], conflict = false, onReload, commit = null, type = null, onRestore = null, restoredFrom = null,
}) {
  const [showHistory, setShowHistory] = useState(false)
  const deploy = useDeployStatus(savedAt ? commit : null)
  const blocked = errors.length > 0

  return (
    <div className="admin-savebar">
      <div className="admin-savebar-row">
        <button type="button" className="admin-btn" onClick={onSave} disabled={saving || !dirty || blocked}>
          {saving ? 'Saving…' : 'Save changes'}
        </button>
        {type && onRestore && (
          <button type="button" className="admin-btn-ghost" onClick={() => setShowHistory(true)}>History</button>
        )}
        <div className="admin-savebar-status">
          {error && <span className="admin-error">{error}</span>}
          {conflict && onReload && (
            <button
              type="button"
              className="admin-btn-ghost"
              onClick={() => confirm('Reload the latest version? Your unsaved edits on this tab will be lost.') && onReload()}
            >
              Reload latest
            </button>
          )}
          {!error && saving && <span className="admin-hint">Committing to GitHub…</span>}
          {!error && !saving && savedAt && !dirty && (
            <span className={`admin-hint admin-deploy is-${deploy}`}>
              {deploy === 'live' && '✓ Saved and live on your site'}
              {deploy === 'deploying' && 'Saved. Your site is rebuilding, usually 30 to 60 seconds…'}
              {(deploy === 'unknown' || deploy === 'idle') && 'Saved. Your site will update within a minute or two.'}
            </span>
          )}
          {!error && !saving && !savedAt && dirty && !restoredFrom && <span className="admin-hint">Unsaved changes</span>}
          {!error && !saving && dirty && restoredFrom && (
            <span className="admin-hint">Loaded an older version. Check it, then press Save to bring it back.</span>
          )}
        </div>
      </div>
      {blocked && dirty && (
        <ul className="admin-problems" role="alert">
          {errors.map((e) => <li key={e}>{e}</li>)}
        </ul>
      )}
      {showHistory && (
        <HistoryPanel type={type} onRestore={onRestore} onClose={() => setShowHistory(false)} />
      )}
    </div>
  )
}
