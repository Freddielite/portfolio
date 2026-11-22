import { useRef, useState } from 'react'
import { Pencil, Tags } from 'lucide-react'
import { PopupSurface, usePopup } from '../Popup.jsx'
import { planRename, tagCounts } from '../tagTools.js'

// Every tag used by your posts (published and drafts) with how many posts carry it.
// Rename one to change it on every post at once; type the name of another tag to merge
// them. Changes go into the posts list on screen like any other edit: nothing is on the
// site until you Save, and Undo is offered at once.

function Panel({ list, onRename, onClose }) {
  const counts = tagCounts(list)
  const [editing, setEditing] = useState(null)
  const [value, setValue] = useState('')
  const plan = editing ? planRename(list, editing, value) : null
  const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`

  function start(tag) {
    setEditing(tag)
    setValue(tag)
  }
  function apply() {
    if (!plan?.ok) return
    onRename(plan.from, plan.to)
    setEditing(null)
  }

  return (
    <div className="admin-tagsman">
      <p className="admin-hint admin-tagsman-note">
        Rename a tag to change it on every post at once, or type another tag's name to merge the two. A post with no tags of its own gets tags chosen from its title and summary, and a rename gives those posts their own.
      </p>
      {!counts.length && <p className="admin-hint admin-tagsman-note">No tags yet.</p>}
      <ul className="admin-tagsman-list">
        {counts.map(([tag, n]) => (
          <li key={tag} className={editing === tag ? 'is-editing' : ''}>
            {editing === tag ? (
              <div className="admin-tagsman-edit">
                <div className="admin-field">
                  <input
                    value={value}
                    autoFocus
                    aria-label={`New name for ${tag}`}
                    enterKeyHint="done"
                    autoCapitalize="off"
                    autoComplete="off"
                    onChange={(e) => setValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        apply()
                      } else if (e.key === 'Escape') setEditing(null)
                    }}
                  />
                </div>
                <p className="admin-hint admin-tagsman-plan">
                  {plan.ok
                    ? `${plan.merges ? `Merges into “${plan.to}” (${plural(plan.mergeCount, 'post')} already). ` : ''}Changes ${plural(plan.posts, 'post')}.${plan.automatic ? ` ${plural(plan.automatic, 'post')} get their own tags now.` : ''}`
                    : value.trim() === tag ? 'Type the new name.' : plan.reason}
                </p>
                <div className="admin-tagsman-buttons">
                  <button type="button" className="admin-btn" onClick={apply} disabled={!plan.ok}>{plan.merges ? 'Merge' : 'Rename'}</button>
                  <button type="button" className="admin-btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
                </div>
              </div>
            ) : (
              <>
                <span className="admin-tagsman-name">
                  <strong>{tag}</strong>
                  <span className="admin-hint">{plural(n, 'post')}</span>
                </span>
                <button type="button" className="admin-btn-ghost admin-btn-icon-text admin-tagsman-rename" onClick={() => start(tag)} aria-label={`Rename ${tag}`}>
                  <Pencil size={14} aria-hidden="true" /> Rename
                </button>
              </>
            )}
          </li>
        ))}
      </ul>
      <div className="admin-lib-picker-foot">
        <button type="button" className="admin-btn-ghost" onClick={onClose}>Done</button>
      </div>
    </div>
  )
}

export default function TagsManager({ list, onRename }) {
  const btnRef = useRef(null)
  const { open, show, hide } = usePopup(btnRef)
  return (
    <>
      <button ref={btnRef} type="button" className="admin-btn-ghost admin-btn-icon-text" aria-haspopup="dialog" aria-expanded={open} onClick={show}>
        <Tags size={15} aria-hidden="true" /> Tags
      </button>
      {open && (
        <PopupSurface asSheet label="Tags" anchor={btnRef} onClose={hide} className="admin-lib-pop">
          {(close) => <Panel list={list} onRename={onRename} onClose={() => close(() => hide())} />}
        </PopupSurface>
      )}
    </>
  )
}
