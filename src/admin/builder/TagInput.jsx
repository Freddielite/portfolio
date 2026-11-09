import { useRef, useState } from 'react'
import { X } from 'lucide-react'

// Tags as chips. Type a tag and press Enter or comma to add it; Backspace on an
// empty box takes the last one back; tap x on a chip to remove it. Pasting
// "a, b, c" adds three. A comma typed anywhere (including on phone keyboards, which
// do not report the key) ends the tag, so nothing is lost or rewritten while you type.
export default function TagInput({ value, onChange, placeholder = 'Type a tag, then Enter', label = 'Tags' }) {
  const tags = Array.isArray(value) ? value : []
  const [draft, setDraft] = useState('')
  const inputRef = useRef(null)

  function addMany(parts) {
    const next = [...tags]
    for (const raw of parts) {
      const t = raw.trim().replace(/\s+/g, ' ')
      if (t && !next.some((x) => x.toLowerCase() === t.toLowerCase())) next.push(t)
    }
    if (next.length !== tags.length) onChange(next)
  }

  function onType(text) {
    if (!text.includes(',')) return setDraft(text)
    const parts = text.split(',')
    const rest = parts.pop() // what is after the last comma stays in the box
    addMany(parts)
    setDraft(rest.trimStart())
  }

  function onKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault() // never submits or saves anything
      addMany([draft])
      setDraft('')
    } else if (e.key === 'Backspace' && !draft && tags.length) {
      onChange(tags.slice(0, -1))
    }
  }

  return (
    <div className="admin-tags" onClick={() => inputRef.current?.focus()}>
      {tags.map((t) => (
        <span className="admin-chip" key={t}>
          {t}
          <button
            type="button"
            aria-label={`Remove ${t}`}
            onClick={(e) => {
              e.stopPropagation()
              onChange(tags.filter((x) => x !== t))
              inputRef.current?.focus()
            }}
          >
            <X size={13} aria-hidden="true" />
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        className="admin-tags-input"
        value={draft}
        aria-label={label}
        placeholder={tags.length ? '' : placeholder}
        enterKeyHint="done"
        autoCapitalize="off"
        autoComplete="off"
        onChange={(e) => onType(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => {
          if (draft.trim()) {
            addMany([draft])
            setDraft('')
          }
        }}
      />
    </div>
  )
}
