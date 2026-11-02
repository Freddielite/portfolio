import { useEffect, useState } from 'react'
import useAdminContent from '../useAdminContent.js'
import useUnsavedChangesWarning from '../useUnsavedChangesWarning.js'
import SaveBar from '../SaveBar.jsx'
import useDragReorder from '../useDragReorder.js'
import { validateTestimonials } from '../validate.js'

function blank() {
  return { id: `t${Date.now()}`, quote: '', author: '', role: '' }
}

export default function TestimonialsEditor() {
  const { data, loading, saving, error, conflict, savedAt, commit, save, reload } = useAdminContent('testimonials')
  const [list, setList] = useState(null)
  const [restoredFrom, setRestoredFrom] = useState(null)
  const { handleProps, dropProps, over } = useDragReorder(setList)

  useEffect(() => {
    if (data) {
      setList(data)
      setRestoredFrom(null)
    }
  }, [data])

  const dirty = !loading && list && JSON.stringify(list) !== JSON.stringify(data)
  useUnsavedChangesWarning(dirty)

  if (loading || !list) return <p className="admin-hint">Loading…</p>

  const bar = {
    saving, error, savedAt, dirty, conflict, commit, restoredFrom, errors: validateTestimonials(list), onReload: reload, type: 'testimonials',
    onRestore: (d, c) => { setList(d); setRestoredFrom(c) },
    onSave: () => save(list),
  }

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
      <SaveBar {...bar} />
      <p className="admin-hint">
        Toggle whether this section shows at all from the Site Settings tab.
      </p>

      {list.map((t, i) => (
        <div className={`admin-card ${over === i ? 'is-over' : ''} ${t.hidden ? 'is-hidden' : ''}`} key={i} {...dropProps(i)}>
          <div className="admin-card-header">
            <strong>
              <span className="admin-drag" title="Drag to reorder" {...handleProps(i)}>⋮⋮</span>{' '}
              {t.author || 'New testimonial'}
              {t.hidden && <span className="admin-badge">Hidden</span>}
            </strong>
            <button type="button" className="admin-btn-danger" onClick={() => removeAt(i)}>Delete</button>
          </div>
          <label className="admin-checkbox">
            <input type="checkbox" checked={!t.hidden} onChange={(e) => update(i, 'hidden', !e.target.checked)} />
            Show on site
          </label>
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

      <SaveBar {...bar} />
    </div>
  )
}
