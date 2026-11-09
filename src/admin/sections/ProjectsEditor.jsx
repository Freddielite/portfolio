import { useEffect, useState } from 'react'
import { GripVertical, ChevronDown, ArrowUp, ArrowDown, Trash2, Plus } from 'lucide-react'
import useAdminContent from '../useAdminContent.js'
import useUnsavedChangesWarning from '../useUnsavedChangesWarning.js'
import SaveBar from '../SaveBar.jsx'
import ImageUploader from '../ImageUploader.jsx'
import TagInput from '../builder/TagInput.jsx'
import ProjectPreview from './ProjectPreview.jsx'
import useDragReorder from '../useDragReorder.js'
import { useAdmin, useReloadOnPull } from '../AdminContext.jsx'
import { validateProjects } from '../validate.js'

// True when the screen is at least this wide; used to put the preview beside the form.
function useMedia(query) {
  const [on, setOn] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const update = () => setOn(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [query])
  return on
}

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

function ProjectRow({ project, open, onToggle, onChange, onRemove, onMove, isFirst, isLast, handleProps, rowProps, isDragging, preview }) {
  function set(key, value) {
    onChange({ ...project, [key]: value })
  }
  function setCaseStudy(key, value) {
    onChange({ ...project, caseStudy: { ...project.caseStudy, [key]: value } })
  }
  const missing = !project.image ? 'No screenshot' : !project.imageAlt ? 'No alt text' : null

  return (
    <div {...rowProps} className={`admin-card admin-collapse ${open ? 'is-open' : ''} ${isDragging ? 'is-dragging' : ''} ${project.hidden ? 'is-hidden' : ''}`}>
      <div className="admin-collapse-head">
        <span {...handleProps}><GripVertical size={18} aria-hidden="true" /></span>
        <button type="button" className="admin-collapse-toggle" onClick={onToggle} aria-expanded={open}>
          {project.image ? <img src={project.image} alt="" className="admin-thumb" /> : <span className="admin-thumb is-empty" aria-hidden="true" />}
          <span className="admin-collapse-title">
            <strong>{project.name || 'Untitled project'}</strong>
            <span className="admin-collapse-meta">
              {project.kind || 'Own product'}
              {project.featured && <span className="admin-badge is-accent">Featured</span>}
              {project.hidden && <span className="admin-badge">Hidden</span>}
              {missing && <span className="admin-badge is-draft">{missing}</span>}
            </span>
          </span>
          <ChevronDown size={18} className="admin-chevron" aria-hidden="true" />
        </button>
      </div>

      {open && (
        <div className="admin-collapse-body">
          <div className="admin-row admin-card-tools">
            <div className="admin-toggles">
              <label className="admin-checkbox">
                <input type="checkbox" checked={!project.hidden} onChange={(e) => set('hidden', !e.target.checked)} />
                Show on site
              </label>
              <label className="admin-checkbox">
                <input type="checkbox" checked={!!project.featured} onChange={(e) => set('featured', e.target.checked)} />
                Featured (large card)
              </label>
            </div>
            <div className="admin-spacer" />
            <button type="button" className="admin-icon-btn" onClick={() => onMove(-1)} disabled={isFirst} aria-label="Move up"><ArrowUp size={16} aria-hidden="true" /></button>
            <button type="button" className="admin-icon-btn" onClick={() => onMove(1)} disabled={isLast} aria-label="Move down"><ArrowDown size={16} aria-hidden="true" /></button>
            <button type="button" className="admin-icon-btn is-danger" onClick={onRemove} aria-label="Delete project"><Trash2 size={16} aria-hidden="true" /></button>
          </div>

          <div className="admin-grid-2">
            <div className="admin-field">
              <label className="admin-label">Name</label>
              <input value={project.name} onChange={(e) => set('name', e.target.value)} />
            </div>
            <div className="admin-field">
              <label className="admin-label">Node ID (e.g. 01)</label>
              <input value={project.id} onChange={(e) => set('id', e.target.value)} />
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
            <TagInput value={project.tags || []} onChange={(tags) => set('tags', tags)} placeholder="React, Full-stack, Payments" />
            <p className="admin-hint">Press Enter or comma after each tag.</p>
          </div>

          <div className="admin-grid-2">
            <div className="admin-field">
              <label className="admin-label">Live site URL</label>
              <input inputMode="url" autoCapitalize="off" spellCheck={false} value={project.live || ''} onChange={(e) => set('live', e.target.value || null)} />
            </div>
            <div className="admin-field">
              <label className="admin-label">GitHub URL</label>
              <input inputMode="url" autoCapitalize="off" spellCheck={false} value={project.github || ''} onChange={(e) => set('github', e.target.value || null)} />
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
          {preview}
        </div>
      )}
    </div>
  )
}

export default function ProjectsEditor() {
  const { data, loading, saving, error, conflict, savedAt, commit, save, reload } = useAdminContent('projects')
  const { toast } = useAdmin()
  const [list, setList] = useState(null)
  const [restoredFrom, setRestoredFrom] = useState(null)
  // One project open at a time, tracked by position. Moves update it.
  const [open, setOpen] = useState(null)
  const follow = (from, to) =>
    setOpen((o) => (o === from ? to : o === null ? null : from < o && to >= o ? o - 1 : from > o && to <= o ? o + 1 : o))
  const { handleProps, rowProps, dragging } = useDragReorder(setList, { onMove: follow })
  const sideBySide = useMedia('(min-width: 1280px)')

  useEffect(() => {
    if (data) {
      setList(data)
      setRestoredFrom(null)
    }
  }, [data])

  const dirty = !loading && !!list && JSON.stringify(list) !== JSON.stringify(data)
  useUnsavedChangesWarning(dirty)
  useReloadOnPull(dirty, reload)

  if (!list) return <p className="admin-hint admin-loading">Loading projects…</p>

  const errors = validateProjects(list)
  const bar = {
    saving, error, savedAt, dirty, errors, conflict, commit, restoredFrom, onReload: reload, type: 'projects',
    onRestore: (d, c) => { setList(d); setRestoredFrom(c) },
    onSave: () => save(list),
    onDiscard: () => { setList(data); setRestoredFrom(null); setOpen(null) },
  }

  function updateAt(i, project) {
    setList((l) => l.map((p, idx) => (idx === i ? project : p)))
  }
  function removeAt(i) {
    const removed = list[i]
    setList((l) => l.filter((_, idx) => idx !== i))
    setOpen(null)
    toast(`Deleted “${removed.name || 'project'}”`, {
      action: { label: 'Undo', onClick: () => setList((l) => [...l.slice(0, i), removed, ...l.slice(i)]) },
    })
  }
  function moveAt(i, dir) {
    const j = i + dir
    if (j < 0 || j >= list.length) return
    setList((l) => {
      const next = [...l]
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
    setOpen((o) => (o === i ? j : o === j ? i : o))
  }
  function addProject() {
    setList((l) => [...l, blankProject()])
    setOpen(list.length)
    requestAnimationFrame(() => document.querySelector('.admin-collapse.is-open')?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  const openProject = open !== null ? list[open] : null

  return (
    <div className="admin-section">
      <SaveBar {...bar} />
      <div className={`admin-split ${sideBySide ? 'has-side' : ''}`}>
        <div className="admin-split-main">
          <p className="admin-hint admin-intro">Tap a project to edit it. Drag the grip to change the order. Hidden projects stay saved but do not show on the site.</p>

          <div className="admin-stack">
            {list.map((project, i) => (
              <ProjectRow
                key={i}
                project={project}
                open={open === i}
                onToggle={() => setOpen((o) => (o === i ? null : i))}
                onChange={(p) => updateAt(i, p)}
                onRemove={() => removeAt(i)}
                onMove={(dir) => moveAt(i, dir)}
                isFirst={i === 0}
                isLast={i === list.length - 1}
                handleProps={handleProps(i)}
                rowProps={rowProps(i)}
                isDragging={dragging === i}
                preview={!sideBySide && open === i ? <ProjectPreview project={project} /> : null}
              />
            ))}
          </div>

          <button type="button" className="admin-btn-add" onClick={addProject}>
            <Plus size={16} aria-hidden="true" /> Add project
          </button>
        </div>

        {sideBySide && (
          <div className="admin-split-side">
            <ProjectPreview project={openProject} />
          </div>
        )}
      </div>
    </div>
  )
}
