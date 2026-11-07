import { useCallback, useEffect, useId, useRef, useState } from 'react'

// Drag-to-reorder for a list kept in React state, built on pointer events so it
// works the same with a mouse, a finger or a pen. Give each row's grip
// `handleProps(i)` and the whole row `rowProps(i)`. Rows move live under the
// pointer, the page scrolls when you drag near the top or bottom edge, and the
// grip also answers the keyboard (arrow up and down).
//
// Options: onMove(from, to) after every step, onStart(i) when a drag begins.
export default function useDragReorder(setList, { onMove, onStart } = {}) {
  const listId = useId()
  const drag = useRef(null)
  const scroll = useRef({ raf: 0, speed: 0 })
  const [dragging, setDragging] = useState(null)
  const opts = useRef({ onMove, onStart })
  opts.current = { onMove, onStart }

  const move = useCallback(
    (from, to) => {
      if (from === to) return
      setList((l) => {
        if (to < 0 || to >= l.length) return l
        const next = [...l]
        const [item] = next.splice(from, 1)
        next.splice(to, 0, item)
        return next
      })
      opts.current.onMove?.(from, to)
    },
    [setList]
  )

  function stopScroll() {
    cancelAnimationFrame(scroll.current.raf)
    scroll.current.raf = 0
    scroll.current.speed = 0
  }

  function runScroll() {
    if (!scroll.current.speed) return stopScroll()
    window.scrollBy(0, scroll.current.speed)
    scroll.current.raf = requestAnimationFrame(runScroll)
  }

  function end() {
    if (!drag.current) return
    drag.current = null
    setDragging(null)
    stopScroll()
    document.documentElement.classList.remove('admin-is-dragging')
  }

  useEffect(() => () => stopScroll(), [])

  const handleProps = (i) => ({
    role: 'button',
    tabIndex: 0,
    'aria-label': 'Drag to reorder. Arrow keys also move it.',
    title: 'Drag to reorder',
    className: 'admin-grip',
    onPointerDown: (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return
      e.preventDefault()
      e.currentTarget.setPointerCapture?.(e.pointerId)
      drag.current = { index: i }
      setDragging(i)
      opts.current.onStart?.(i)
      document.documentElement.classList.add('admin-is-dragging')
      navigator.vibrate?.(8)
    },
    onPointerMove: (e) => {
      const d = drag.current
      if (!d) return
      // Scroll the page when the pointer is near the top or bottom edge.
      const edge = 90
      const y = e.clientY
      const h = window.innerHeight
      scroll.current.speed = y < edge ? -Math.ceil((edge - y) / 6) : y > h - edge - 70 ? Math.ceil((y - (h - edge - 70)) / 6) : 0
      if (scroll.current.speed && !scroll.current.raf) scroll.current.raf = requestAnimationFrame(runScroll)

      const el = document.elementFromPoint(e.clientX, y)?.closest(`[data-drag-list="${listId}"]`)
      if (!el) return
      const to = Number(el.dataset.dragIndex)
      if (Number.isNaN(to) || to === d.index) return
      // Only swap once the pointer passes the middle of the row it is over, so
      // a short row dragged past a tall one does not flip back and forth.
      const r = el.getBoundingClientRect()
      const mid = r.top + r.height / 2
      if ((to > d.index && y < mid) || (to < d.index && y > mid)) return
      move(d.index, to)
      d.index = to
      setDragging(to)
    },
    onPointerUp: end,
    onPointerCancel: end,
    onLostPointerCapture: end,
    onKeyDown: (e) => {
      if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return
      e.preventDefault()
      const to = i + (e.key === 'ArrowUp' ? -1 : 1)
      setList((l) => {
        if (to < 0 || to >= l.length) return l
        const next = [...l]
        const [item] = next.splice(i, 1)
        next.splice(to, 0, item)
        return next
      })
      opts.current.onMove?.(i, to)
      // Keep focus on the grip of the row that moved.
      const target = e.currentTarget.closest(`[data-drag-list="${listId}"]`)?.parentElement
      requestAnimationFrame(() => {
        target?.querySelector(`[data-drag-list="${listId}"][data-drag-index="${to}"] .admin-grip`)?.focus()
      })
    },
  })

  const rowProps = (i) => ({
    'data-drag-list': listId,
    'data-drag-index': i,
  })

  return { handleProps, rowProps, dragging, move }
}
