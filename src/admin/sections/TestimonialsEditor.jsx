import { useEffect, useState } from 'react'
import { GripVertical, Eye, EyeOff, Trash2, Plus } from 'lucide-react'
import useAdminContent from '../useAdminContent.js'
import useUnsavedChangesWarning from '../useUnsavedChangesWarning.js'
import SaveBar from '../SaveBar.jsx'
import useDragReorder from '../useDragReorder.js'
import { useAdmin } from '../AdminContext.jsx'
import { validateTestimonials } from '../validate.js'

function blank() {
  return { id: `t${Date.now()}`, quote: '', author: '', role: '' }
}

export default function TestimonialsEditor({ go }) {
  const { data, loading, saving, error, conflict, savedAt, commit, save, reload } = useAdminContent('testimonials')
  const { toast } = useAdmin()
  const [list, setList] = useState(null)
  const [restoredFrom, setRestoredFrom] = useState(null)
  const { handleProps, rowProps, dragging } = useDragReorder(setList)

  useEffect(() => {
    if (data) {
      setList(data)
      setRestoredFrom(null)
    }
  }, [data])

  const dirty = !loading && !!list && JSON.stringify(list) !== JSON.stringify(data)
  useUnsavedChangesWarning(dirty)

  if (loading || !list) return <p className="admin-hint admin-loading">Loading testimonials…</p>

  const bar = {
    saving, error, savedAt, dirty, conflict, commit, restoredFrom, errors: validateTestimonials(list), onReload: reload, type: 'testimonials',
    onRestore: (d, c) => { setList(d); setRestoredFrom(c) },
    onSave: () => save(list),
    onDiscard: () => { setList(data); setRestoredFrom(null) },
  }

  function update(i, key, value) {
    setList((l) => l.map((t, idx) => (idx === i ? { ...t, [key]: value } : t)))
  }
  function removeAt(i) {
    const removed = list[i]
    setList((l) => l.filter((_, idx) => idx !== i))
    toast(`Deleted the quote from ${removed.author || 'this person'}`, {
      action: { label: 'Undo', onClick: () => setList((l) => [...l.slice(0, i), removed, ...l.slice(i)]) },
    })
  }
  function add() {
    setList((l) => [...l, blank()])
    requestAnimationFrame(() => {
      const areas = document.querySelectorAll('.admin-quote textarea')
      areas[areas.length - 1]?.focus()
    })
  }

  return (
    <div className="admin-section">
      <SaveBar {...bar} />
      <p className="admin-hint admin-intro">
        The whole section can be switched on or off in{' '}
        <button type="button" className="admin-inline-link" onClick={() => go?.('settings', 'showTestimonials')}>Site settings</button>.
      </p>

      <div className="admin-stack">
        {list.map((t, i) => (
          <div key={i} {...rowProps(i)} className={`admin-card admin-quote ${dragging === i ? 'is-dragging' : ''} ${t.hidden ? 'is-hidden' : ''}`}>
            <div className="admin-quote-head">
              <span {...handleProps(i)}><GripVertical size={18} aria-hidden="true" /></span>
              <strong>{t.author || 'New testimonial'}</strong>
              {t.hidden && <span className="admin-badge">Hidden</span>}
              <div className="admin-spacer" />
              <button
                type="button"
                className={`admin-icon-btn ${t.hidden ? 'is-off' : ''}`}
                aria-pressed={!t.hidden}
                aria-label={t.hidden ? 'Show on the site' : 'Hide from the site'}
                title={t.hidden ? 'Hidden from the site' : 'Shown on the site'}
                onClick={() => update(i, 'hidden', !t.hidden)}
              >
                {t.hidden ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
              </button>
              <button type="button" className="admin-icon-btn is-danger" aria-label="Delete testimonial" onClick={() => removeAt(i)}>
                <Trash2 size={17} aria-hidden="true" />
              </button>
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
      </div>

      <button type="button" className="admin-btn-add" onClick={add}>
        <Plus size={16} aria-hidden="true" /> Add testimonial
      </button>
    </div>
  )
}
