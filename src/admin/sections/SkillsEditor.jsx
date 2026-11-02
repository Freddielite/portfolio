import { useEffect, useState } from 'react'
import useAdminContent from '../useAdminContent.js'
import useUnsavedChangesWarning from '../useUnsavedChangesWarning.js'
import SaveBar from '../SaveBar.jsx'
import useDragReorder from '../useDragReorder.js'
import { validateSkills } from '../validate.js'

export default function SkillsEditor() {
  const { data, loading, saving, error, conflict, savedAt, commit, save, reload } = useAdminContent('skills')
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
    saving, error, savedAt, dirty, conflict, commit, restoredFrom, errors: validateSkills(list), onReload: reload, type: 'skills',
    onRestore: (d, c) => { setList(d); setRestoredFrom(c) },
    onSave: () => save(list),
  }

  function update(i, key, value) {
    setList((l) => l.map((s, idx) => (idx === i ? { ...s, [key]: value } : s)))
  }
  function removeAt(i) {
    setList((l) => l.filter((_, idx) => idx !== i))
  }
  function add() {
    setList((l) => [...l, { name: 'New skill', level: 70 }])
  }
  function move(i, dir) {
    setList((l) => {
      const next = [...l]
      const j = i + dir
      if (j < 0 || j >= next.length) return l
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })
  }

  return (
    <div className="admin-section">
      <SaveBar {...bar} />
      <p className="admin-hint">Drag the ⋮⋮ handle to reorder. Untick Show to hide a skill without deleting it.</p>

      {list.map((skill, i) => (
        <div className={`admin-card admin-card-row ${over === i ? 'is-over' : ''} ${skill.hidden ? 'is-hidden' : ''}`} key={i} {...dropProps(i)}>
          <span className="admin-drag" title="Drag to reorder" {...handleProps(i)}>⋮⋮</span>
          <input
            className="admin-skill-name"
            value={skill.name}
            onChange={(e) => update(i, 'name', e.target.value)}
          />
          <input
            type="number"
            min={0}
            max={100}
            className="admin-skill-level"
            value={skill.level}
            onChange={(e) => update(i, 'level', Number(e.target.value))}
          />
          <span className="admin-hint">%</span>
          <label className="admin-checkbox">
            <input type="checkbox" checked={!skill.hidden} onChange={(e) => update(i, 'hidden', !e.target.checked)} />
            Show
          </label>
          <button type="button" className="admin-btn-ghost" onClick={() => move(i, -1)} disabled={i === 0}>↑</button>
          <button type="button" className="admin-btn-ghost" onClick={() => move(i, 1)} disabled={i === list.length - 1}>↓</button>
          <button type="button" className="admin-btn-danger" onClick={() => removeAt(i)}>Delete</button>
        </div>
      ))}

      <button type="button" className="admin-btn-ghost admin-btn-add" onClick={add}>
        + Add skill
      </button>

      <SaveBar {...bar} />
    </div>
  )
}
