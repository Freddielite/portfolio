import { useEffect, useId, useRef, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { haptic } from './native.js'
import { PopupSurface, usePopup } from './Popup.jsx'

// The admin's own dropdown, used instead of <select>, so choosing never opens
// Android's or the browser's plain list. On phones the choices open as a sheet
// from the bottom (like More), with big rows in thumb reach; the phone's Back
// closes it. On wider screens they open as a small menu under the button.
// Keyboard: arrows, Home/End, Enter or Space to pick, Esc to close.
//
//   <Picker value={v} onChange={setV} label="Lock the app"
//     options={[{ value: 'now', label: 'Right away' }, ...]} />
//
// `compact` makes a small inline button (used in the post editor).

export default function Picker({ value, onChange, options, label, compact = false, className = '', id }) {
  const btnRef = useRef(null)
  const { open, asSheet, show, hide } = usePopup(btnRef)
  const autoId = useId()
  const listId = `${id || autoId}-list`
  const current = options.find((o) => o.value === value) || options[0]

  function pick(v) {
    if (v !== value) {
      haptic.tap()
      onChange(v)
    }
    hide()
  }

  return (
    <span className={`admin-picker ${compact ? 'is-compact' : ''} ${className}`}>
      <button
        ref={btnRef}
        id={id}
        type="button"
        className={`admin-picker-btn ${compact ? 'is-compact' : ''}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={label ? `${label}: ${current?.label}` : undefined}
        onClick={() => (open ? hide() : show())}
        onKeyDown={(e) => {
          if (['ArrowDown', 'ArrowUp'].includes(e.key) && !open) {
            e.preventDefault()
            show()
          }
        }}
      >
        <span className="admin-picker-value">{current?.label}</span>
        <ChevronDown size={compact ? 14 : 16} className={`admin-picker-chevron ${open ? 'is-open' : ''}`} aria-hidden="true" />
      </button>
      {open && (
        <PopupSurface asSheet={asSheet} label={label} anchor={btnRef} onClose={hide}>
          {(close) => (
            <Options
              listId={listId}
              label={label}
              options={options}
              value={value}
              rowClass={asSheet ? 'admin-picker-row' : 'admin-picker-item'}
              onPick={(v) => close(() => pick(v))}
              onClose={(focus) => close(() => hide(focus))}
            />
          )}
        </PopupSurface>
      )}
    </span>
  )
}

// The list itself, shared by the sheet and the menu.
function Options({ listId, label, options, value, onPick, onClose, rowClass }) {
  const listRef = useRef(null)
  const [active, setActive] = useState(() => Math.max(0, options.findIndex((o) => o.value === value)))

  useEffect(() => {
    listRef.current?.querySelectorAll('[role="option"]')[active]?.focus({ preventScroll: false })
  }, [active])

  function onKeyDown(e) {
    const last = options.length - 1
    const moves = { ArrowDown: Math.min(last, active + 1), ArrowUp: Math.max(0, active - 1), Home: 0, End: last }
    if (e.key in moves) {
      e.preventDefault()
      setActive(moves[e.key])
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onPick(options[active].value)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      onClose()
    } else if (e.key === 'Tab') {
      onClose(false)
    }
  }

  return (
    <ul ref={listRef} id={listId} role="listbox" aria-label={label} className="admin-picker-list" onKeyDown={onKeyDown}>
      {options.map((o, i) => {
        const selected = o.value === value
        return (
          <li
            key={o.value}
            role="option"
            aria-selected={selected}
            tabIndex={i === active ? 0 : -1}
            className={`${rowClass} ${selected ? 'is-selected' : ''}`}
            onClick={() => onPick(o.value)}
            onMouseEnter={() => setActive(i)}
          >
            <span className="admin-picker-text">
              <strong>{o.label}</strong>
              {o.hint && <span>{o.hint}</span>}
            </span>
            <span className="admin-picker-mark" aria-hidden="true">{selected && <Check size={16} strokeWidth={2.6} />}</span>
          </li>
        )
      })}
    </ul>
  )
}
