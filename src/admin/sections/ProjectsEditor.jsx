import { useEffect, useState } from 'react'
import useAdminContent from '../useAdminContent.js'
import useUnsavedChangesWarning from '../useUnsavedChangesWarning.js'
import SaveBar from '../SaveBar.jsx'
import ImageUploader from '../ImageUploader.jsx'
import useDragReorder from '../useDragReorder.js'
import { validateProjects } from '../validate.js'

function blankProject() {
  return {
    id: String(Date.now()).slice(-4),
    name: 'New project',
    description: '',
    tags: [],
    live: '',
    github: '',
    image: null,
    caseStudy: { problem: '', approach: '', outcome: '' },
  }
}

function ProjectCard({ project, onChange, onRemove, onMove, isFirst, isLast, handleProps, dropProps, isOver }) {
  function set(key, value) {
    onChange({ ...project, [key]: value })
  }
  function setCaseStudy(key, value) {
    onChange({ ...project, caseStudy: { ...project.caseStudy, [key]: value } })
  }

  return (
    <div className={`admin-card ${isOver ? 'is-over' : ''} ${project.hidden ? 'is-hidden' : ''}`} {...dropProps}>
      <div className="admin-card-header">
        <strong>
          <span className="admin-drag" title="Drag to reorder" {...handleProps}>⋮⋮</span>{' '}
          {project.name || 'Untitled project'}
          {project.hidden && <span className="admin-badge">Hidden</span>}
          {project.featured && <span className="admin-badge is-accent">Featured</span>}
        </strong>
        <div className="admin-card-actions">
          <button type="button" className="admin-btn-ghost" onClick={onMove.bind(null, -1)} disabled={isFirst}>↑</button>
          <button type="button" className="admin-btn-ghost" onClick={onMove.bind(null, 1)} disabled={isLast}>↓</button>
          <button type="button" className="admin-btn-danger" onClick={onRemove}>Delete</button>
        </div>
      </div>

      <div className="admin-toggles">
        <label className="admin-checkbox">
          <input type="checkbox" checked={!project.hidden} onChange={(e) => set('hidden', !e.target.checked)} />
          Show on site
        </label>
        <label className="admin-checkbox">
          <input type="checkbox" checked={!!project.featured} onChange={(e) => set('featured', e.target.checked)} />
          Featured (shown as the large card)
        </label>
      </div>

      <div className="admin-grid-2">
        <div className="admin-field">
          <label className="admin-label">Node ID (e.g. 01)</label>
          <input value={project.id} onChange={(e) => set('id', e.target.value)} />
        </div>
        <div className="admin-field">
          <label className="admin-label">Name</label>
          <input value={project.name} onChange={(e) => set('name', e.target.value)} />
        </div>
      </div>

      <div className="admin-field">
        <label className="admin-label">Type</label>
        <select value={project.kind || 'Own product'} onChange={(e) => set('kind', e.target.value)}>
          <option value="Own product">Own product</option>
          <option value="Client work">Client work</option>
          <option value="Company">Company</option>
        </select>
        <p className="admin-hint">Shown as a badge on the project card and used by the Work filter.</p>
      </div>

      <div className="admin-field">
        <label className="admin-label">Description</label>
        <textarea rows={4} value={project.description} onChange={(e) => set('description', e.target.value)} />
      </div>

      <div className="admin-field">
        <label className="admin-label">Tags</label>
        <input
          value={(project.tags || []).join(', ')}
          onChange={(e) => set('tags', e.target.value.split(',').map((t) => t.trim()).filter(Boolean))}
          placeholder="React, Full-stack, Payments"
        />
        <p className="admin-hint">Comma-separated.</p>
      </div>

      <div className="admin-grid-2">
        <div className="admin-field">
          <label className="admin-label">Live site URL</label>
          <input value={project.live || ''} onChange={(e) => set('live', e.target.value || null)} />
        </div>
        <div className="admin-field">
          <label className="admin-label">GitHub URL</label>
          <input value={project.github || ''} onChange={(e) => set('github', e.target.value || null)} />
        </div>
      </div>

      <ImageUploader
        label="Screenshot"
        value={project.image}
        onChange={(v, meta) => onChange({ ...project, image: v, imageLqip: v ? meta?.lqip || null : null, imageAlt: v ? project.imageAlt : null })}
        alt={project.imageAlt}
        onAltChange={(v) => set('imageAlt', v)}
        folder="projects"
      />

      <h4>Case study</h4>
      <div className="admin-field">
        <label className="admin-label">Problem</label>
        <textarea rows={4} value={project.caseStudy?.problem || ''} onChange={(e) => setCaseStudy('problem', e.target.value)} />
      </div>
      <div className="admin-field">
        <label className="admin-label">Approach</label>
        <textarea rows={4} value={project.caseStudy?.approach || ''} onChange={(e) => setCaseStudy('approach', e.target.value)} />
      </div>
      <div className="admin-field">
        <label className="admin-label">Outcome</label>
        <textarea rows={4} value={project.caseStudy?.outcome || ''} onChange={(e) => setCaseStudy('outcome', e.target.value)} />
      </div>
    </div>
  )
}

export default function ProjectsEditor() {
  const { data, loading, saving, error, conflict, savedAt, commit, save, reload } = useAdminContent('projects')
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

  const errors = validateProjects(list)
  const bar = {
    saving, error, savedAt, dirty, errors, conflict, commit, restoredFrom, onReload: reload, type: 'projects',
    onRestore: (d, c) => { setList(d); setRestoredFrom(c) },
    onSave: () => save(list),
  }

  function updateAt(i, project) {
    setList((l) => l.map((p, idx) => (idx === i ? project : p)))
  }
  function removeAt(i) {
    if (!confirm('Delete this project?')) return
    setList((l) => l.filter((_, idx) => idx !== i))
  }
  function moveAt(i, dir) {
    setList((l) => {
      const next = [...l]
      const j = i + dir
      if (j < 0 || j >= next.length) return l
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
  }
  function addProject() {
    setList((l) => [...l, blankProject()])
  }

  return (
    <div className="admin-section">
      <SaveBar {...bar} />
      <p className="admin-hint">Drag the ⋮⋮ handle (or use the arrows) to change the order. Hidden projects stay saved but do not show on the site.</p>

      {list.map((project, i) => (
        <ProjectCard
          key={i}
          project={project}
          onChange={(p) => updateAt(i, p)}
          onRemove={() => removeAt(i)}
          onMove={(dir) => moveAt(i, dir)}
          isFirst={i === 0}
          isLast={i === list.length - 1}
          handleProps={handleProps(i)}
          dropProps={dropProps(i)}
          isOver={over === i}
        />
      ))}

      <button type="button" className="admin-btn-ghost admin-btn-add" onClick={addProject}>
        + Add project
      </button>

      <SaveBar {...bar} />
    </div>
  )
}
