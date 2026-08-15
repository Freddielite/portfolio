export default function SaveBar({ saving, error, savedAt, onSave, dirty }) {
  return (
    <div className="admin-savebar">
      <button type="button" className="admin-btn" onClick={onSave} disabled={saving || !dirty}>
        {saving ? 'Saving…' : 'Save changes'}
      </button>
      <div className="admin-savebar-status">
        {error && <span className="admin-error">{error}</span>}
        {!error && saving && <span className="admin-hint">Committing to GitHub…</span>}
        {!error && !saving && savedAt && (
          <span className="admin-hint admin-success">
            Saved — your site will redeploy in ~30–60s.
          </span>
        )}
        {!error && !saving && !savedAt && dirty && (
          <span className="admin-hint">Unsaved changes</span>
        )}
      </div>
    </div>
  )
}
