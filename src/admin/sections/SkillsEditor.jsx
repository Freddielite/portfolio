import { useEffect, useState } from 'react'
import { GripVertical, Eye, EyeOff, Trash2, Plus } from 'lucide-react'
import useAdminContent from '../useAdminContent.js'
import useUnsavedChangesWarning from '../useUnsavedChangesWarning.js'
import SaveBar from '../SaveBar.jsx'
import useDragReorder from '../useDragReorder.js'
import { useAdmin } from '../AdminContext.jsx'
import { validateSkills } from '../validate.js'

export default function SkillsEditor() {
  const { data, loading, saving, error, conflict, savedAt, commit, save, reload } = useAdminContent('skills')
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

  if (loading || !list) return <p className="admin-hint admin-loading">Loading skills…</p>

  const bar = {
    saving, error, savedAt, dirty, conflict, commit, restoredFrom, errors: validateSkills(list), onReload: reload, type: 'skills',
    onRestore: (d, c) => { setList(d); setRestoredFrom(c) },
    onSave: () => save(list),
    onDiscard: () => { setList(data); setRestoredFrom(null) },
  }

  function update(i, key, value) {
    setList((l) => l.map((s, idx) => (idx === i ? { ...s, [key]: value } : s)))
  }
  function removeAt(i) {
    const removed = list[i]
    setList((l) => l.filter((_, idx) => idx !== i))
    toast(`Removed “${removed.name || 'skill'}”`, {
      action: { label: 'Undo', onClick: () => setList((l) => [...l.slice(0, i), removed, ...l.slice(i)]) },
    })
  }
  function add() {
    setList((l) => [...l, { name: '', level: 70 }])
    requestAnimationFrame(() => {
      const inputs = document.querySelectorAll('.admin-skill .admin-skill-name')
      inputs[inputs.length - 1]?.focus()
    })
  }
  const clamp = (n) => Math.max(0, Math.min(100, Number.isFinite(n) ? n : 0))

  return (
    <div className="admin-section">
      <SaveBar {...bar} />
      <p className="admin-hint admin-intro">Drag the grip to reorder. The eye hides a skill without deleting it.</p>

      <ul className="admin-skill-list">
        {list.map((skill, i) => (
          <li
            key={i}
            {...rowProps(i)}
            className={`admin-skill ${dragging === i ? 'is-dragging' : ''} ${skill.hidden ? 'is-hidden' : ''}`}
          >
            <span {...handleProps(i)}><GripVertical size={18} aria-hidden="true" /></span>
            <input
              className="admin-skill-name"
              value={skill.name}
              placeholder="Skill name"
              aria-label={`Skill ${i + 1} name`}
              onChange={(e) => update(i, 'name', e.target.value)}
            />
            <div className="admin-skill-level">
              <input
                type="range"
                min={0}
                max={100}
                value={skill.level}
                aria-label={`${skill.name || 'Skill'} level`}
                style={{ '--fill': `${skill.level}%` }}
                onChange={(e) => update(i, 'level', Number(e.target.value))}
              />
              <label className="admin-skill-num">
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={100}
                  value={skill.level}
                  aria-label={`${skill.name || 'Skill'} level, percent`}
                  onChange={(e) => update(i, 'level', clamp(Number(e.target.value)))}
                />
                <span aria-hidden="true">%</span>
              </label>
            </div>
            <div className="admin-skill-actions">
              <button
                type="button"
                className={`admin-icon-btn ${skill.hidden ? 'is-off' : ''}`}
                aria-pressed={!skill.hidden}
                aria-label={skill.hidden ? `Show ${skill.name || 'skill'} on the site` : `Hide ${skill.name || 'skill'} from the site`}
                title={skill.hidden ? 'Hidden from the site' : 'Shown on the site'}
                onClick={() => update(i, 'hidden', !skill.hidden)}
              >
                {skill.hidden ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
              </button>
              <button type="button" className="admin-icon-btn is-danger" aria-label={`Delete ${skill.name || 'skill'}`} title="Delete" onClick={() => removeAt(i)}>
                <Trash2 size={17} aria-hidden="true" />
              </button>
            </div>
          </li>
        ))}
      </ul>

      <button type="button" className="admin-btn-add" onClick={add}>
        <Plus size={16} aria-hidden="true" /> Add skill
      </button>
    </div>
  )
}
