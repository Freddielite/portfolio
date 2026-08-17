import { useEffect, useState } from 'react'
import useAdminContent from '../useAdminContent.js'
import useUnsavedChangesWarning from '../useUnsavedChangesWarning.js'
import SaveBar from '../SaveBar.jsx'

function blank() {
  return { id: `t${Date.now()}`, quote: '', author: '', role: '' }
}

export default function TestimonialsEditor() {
  const { data, loading, saving, error, savedAt, save } = useAdminContent('testimonials')
  const [list, setList] = useState(null)

  useEffect(() => {
    if (data) setList(data)
  }, [data])

  const dirty = !loading && list && JSON.stringify(list) !== JSON.stringify(data)
  useUnsavedChangesWarning(dirty)

  if (loading || !list) return <p className="admin-hint">Loading…</p>

  function update(i, key, value) {
    setList((l) => l.map((t, idx) => (idx === i ? { ...t, [key]: value } : t)))
  }
  function removeAt(i) {
    setList((l) => l.filter((_, idx) => idx !== i))
  }
  function add() {
    setList((l) => [...l, blank()])
  }

  return (
    <div className="admin-section">
      <SaveBar saving={saving} error={error} savedAt={savedAt} dirty={dirty} onSave={() => save(list)} />
      <p className="admin-hint">
        Toggle whether this section shows at all from the Site Settings tab.
      </p>

      {list.map((t, i) => (
        <div className="admin-card" key={i}>
          <div className="admin-card-header">
            <strong>{t.author || 'New testimonial'}</strong>
            <button type="button" className="admin-btn-danger" onClick={() => removeAt(i)}>Delete</button>
          </div>
          <div className="admin-field">
            <label className="admin-label">Quote</label>
            <textarea rows={3} value={t.quote} onChange={(e) => update(i, 'quote', e.target.value)} />
          </div>
          <div className="admin-grid-2">
            <div className="admin-field">
              <label className="admin-label">Author</label>
              <input value={t.author} onChange={(e) => update(i, 'author', e.target.value)} />
            </div>
            <div className="admin-field">
              <label className="admin-label">Role</label>
              <input value={t.role} onChange={(e) => update(i, 'role', e.target.value)} />
            </div>
          </div>
        </div>
      ))}

      <button type="button" className="admin-btn-ghost admin-btn-add" onClick={add}>
        + Add testimonial
      </button>

      <SaveBar saving={saving} error={error} savedAt={savedAt} dirty={dirty} onSave={() => save(list)} />
    </div>
  )
}
