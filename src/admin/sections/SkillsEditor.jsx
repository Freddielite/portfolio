import { useEffect, useState } from 'react'
import useAdminContent from '../useAdminContent.js'
import useUnsavedChangesWarning from '../useUnsavedChangesWarning.js'
import SaveBar from '../SaveBar.jsx'

export default function SkillsEditor() {
  const { data, loading, saving, error, savedAt, save } = useAdminContent('skills')
  const [list, setList] = useState(null)

  useEffect(() => {
    if (data) setList(data)
  }, [data])

  if (loading || !list) return <p className="admin-hint">Loading…</p>

  const dirty = JSON.stringify(list) !== JSON.stringify(data)
  useUnsavedChangesWarning(dirty)

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
      <SaveBar saving={saving} error={error} savedAt={savedAt} dirty={dirty} onSave={() => save(list)} />

      {list.map((skill, i) => (
        <div className="admin-card admin-card-row" key={i}>
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
          <button type="button" className="admin-btn-ghost" onClick={() => move(i, -1)} disabled={i === 0}>↑</button>
          <button type="button" className="admin-btn-ghost" onClick={() => move(i, 1)} disabled={i === list.length - 1}>↓</button>
          <button type="button" className="admin-btn-danger" onClick={() => removeAt(i)}>Delete</button>
        </div>
      ))}

      <button type="button" className="admin-btn-ghost admin-btn-add" onClick={add}>
        + Add skill
      </button>

      <SaveBar saving={saving} error={error} savedAt={savedAt} dirty={dirty} onSave={() => save(list)} />
    </div>
  )
}
