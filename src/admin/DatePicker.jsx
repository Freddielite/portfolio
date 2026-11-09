import { useEffect, useRef, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { haptic } from './native.js'
import { PopupSurface, usePopup } from './Popup.jsx'

// The admin's own date picker, used instead of <input type="date">, so picking
// a date never opens Android's or the browser's calendar. Same pop-up as the
// dropdowns: a sheet from the bottom on phones, a small panel on wider screens.
// Values are plain YYYY-MM-DD strings, as the posts store them.
//
// Keyboard: arrows move a day or a week, Page Up/Down a month, Home/End the
// start or end of the week, Enter picks, Esc closes.

const pad = (n) => String(n).padStart(2, '0')
const toStr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const parse = (s) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s || ''))
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null
}
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
const addMonths = (d, n) => {
  const t = new Date(d.getFullYear(), d.getMonth() + n, 1)
  const last = new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate()
  return new Date(t.getFullYear(), t.getMonth(), Math.min(d.getDate(), last))
}
const sameDay = (a, b) => a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'] // weeks start on Monday

export const formatDay = (s) => {
  const d = parse(s)
  return d ? d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : ''
}

export default function DatePicker({ value, onChange, label = 'Date', placeholder = 'Pick a date' }) {
  const btnRef = useRef(null)
  const { open, asSheet, show, hide } = usePopup(btnRef)

  function pick(s) {
    if (s !== value) {
      haptic.tap()
      onChange(s)
    }
    hide()
  }

  return (
    <span className="admin-picker admin-date">
      <button
        ref={btnRef}
        type="button"
        className="admin-picker-btn admin-date-btn"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`${label}: ${formatDay(value) || 'not set'}`}
        onClick={() => (open ? hide() : show())}
      >
        <CalendarDays size={16} className="admin-date-icon" aria-hidden="true" />
        <span className="admin-picker-value">{formatDay(value) || placeholder}</span>
      </button>
      {open && (
        <PopupSurface asSheet={asSheet} label={label} anchor={btnRef} onClose={hide} className="admin-date-pop">
          {(close) => <Calendar value={value} onPick={(s) => close(() => pick(s))} onClose={(f) => close(() => hide(f))} />}
        </PopupSurface>
      )}
    </span>
  )
}

function Calendar({ value, onPick, onClose }) {
  const today = new Date()
  const selected = parse(value)
  const [focus, setFocus] = useState(() => selected || today)
  const gridRef = useRef(null)
  const moved = useRef(false)

  // The days of the month in focus, padded to whole weeks.
  const first = new Date(focus.getFullYear(), focus.getMonth(), 1)
  const lead = (first.getDay() + 6) % 7
  const start = addDays(first, -lead)
  const days = Array.from({ length: 42 }, (_, i) => addDays(start, i))
  const weeks = days[35].getMonth() === focus.getMonth() ? 6 : 5

  useEffect(() => {
    // Focus follows the keyboard (not on first open, so the page does not jump).
    if (!moved.current) {
      gridRef.current?.querySelector('[tabindex="0"]')?.focus({ preventScroll: true })
      return
    }
    gridRef.current?.querySelector('[tabindex="0"]')?.focus()
  }, [focus])

  function onKeyDown(e) {
    const moves = {
      ArrowLeft: () => addDays(focus, -1),
      ArrowRight: () => addDays(focus, 1),
      ArrowUp: () => addDays(focus, -7),
      ArrowDown: () => addDays(focus, 7),
      PageUp: () => addMonths(focus, -1),
      PageDown: () => addMonths(focus, 1),
      Home: () => addDays(focus, -((focus.getDay() + 6) % 7)),
      End: () => addDays(focus, 6 - ((focus.getDay() + 6) % 7)),
    }
    if (moves[e.key]) {
      e.preventDefault()
      moved.current = true
      setFocus(moves[e.key]())
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onPick(toStr(focus))
    } else if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      onClose()
    }
  }

  const monthName = focus.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })

  return (
    <div className="admin-cal" onKeyDown={onKeyDown}>
      <div className="admin-cal-head">
        <button type="button" className="admin-icon-btn" onClick={() => setFocus(addMonths(focus, -1))} aria-label="Previous month">
          <ChevronLeft size={18} aria-hidden="true" />
        </button>
        <strong aria-live="polite">{monthName}</strong>
        <button type="button" className="admin-icon-btn" onClick={() => setFocus(addMonths(focus, 1))} aria-label="Next month">
          <ChevronRight size={18} aria-hidden="true" />
        </button>
      </div>
      <div className="admin-cal-grid" role="grid" aria-label={monthName} ref={gridRef}>
        <div className="admin-cal-row" role="row">
          {WEEKDAYS.map((w) => (
            <span key={w} className="admin-cal-wd" role="columnheader">{w}</span>
          ))}
        </div>
        {Array.from({ length: weeks }, (_, w) => (
          <div className="admin-cal-row" role="row" key={w}>
            {days.slice(w * 7, w * 7 + 7).map((d) => {
              const other = d.getMonth() !== focus.getMonth()
              const isSel = sameDay(d, selected)
              const isToday = sameDay(d, today)
              return (
                <button
                  key={toStr(d)}
                  type="button"
                  role="gridcell"
                  tabIndex={sameDay(d, focus) ? 0 : -1}
                  aria-selected={isSel}
                  aria-current={isToday ? 'date' : undefined}
                  aria-label={d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  className={`admin-cal-day ${other ? 'is-other' : ''} ${isSel ? 'is-selected' : ''} ${isToday ? 'is-today' : ''}`}
                  onClick={() => onPick(toStr(d))}
                >
                  {d.getDate()}
                </button>
              )
            })}
          </div>
        ))}
      </div>
      <div className="admin-cal-foot">
        <button type="button" className="admin-btn-ghost" onClick={() => onPick(toStr(today))}>Today</button>
      </div>
    </div>
  )
}
