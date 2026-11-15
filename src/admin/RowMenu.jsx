import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { haptic } from './native.js'
import { leavePopup } from './popupHistory.js'

// A menu for a row of a list: press and hold on a phone, right-click with a mouse.
//
//   const rowMenu = useRowMenu()
//   <li {...rowMenu.bind('Post title', () => [{ label: 'Delete', tone: 'danger', icon: Trash2, onSelect }])}>
//   ...
//   {rowMenu.element}
//
// On a phone it is a sheet from the bottom with big targets (and Back closes it); on a
// wider screen it is a small menu where you clicked.

const phone = () => window.matchMedia('(max-width: 860px)').matches
const HOLD_MS = 480

export function useRowMenu() {
  const [menu, setMenu] = useState(null)
  const press = useRef(null)
  const swallowClickUntil = useRef(0)
  const heldAt = useRef(0)

  const open = useCallback((x, y, title, actions) => {
    if (!actions.length) return
    haptic.tap()
    // On a phone the sheet takes a step in the history, so the phone's Back closes it.
    if (phone()) window.history.pushState({ ...(window.history.state || {}), adminPopup: true }, '', window.location.href)
    setMenu({ x, y, title, actions })
  }, [])
  // Closing from the menu itself also takes that step back; Back has already done it.
  const close = useCallback((then) => {
    const finish = () => {
      setMenu(null)
      then?.()
    }
    if (phone()) leavePopup(finish)
    else finish()
  }, [])
  const gone = useCallback(() => setMenu(null), [])

  const cancel = () => {
    if (press.current) clearTimeout(press.current.timer)
    press.current = null
  }
  const skip = (target) => !!target.closest('input, textarea, select, a, [data-no-menu]')

  const bind = useCallback(
    (title, getActions) => ({
      'data-rowmenu': '',
      onPointerDown(e) {
        if (e.pointerType === 'mouse' || skip(e.target)) return // a mouse uses right-click
        cancel()
        const start = { x: e.clientX, y: e.clientY }
        press.current = {
          start,
          timer: setTimeout(() => {
            press.current = null
            swallowClickUntil.current = Date.now() + 900 // the lift that follows must not open the row
            heldAt.current = Date.now()
            open(start.x, start.y, title, getActions())
          }, HOLD_MS),
        }
      },
      onPointerMove(e) {
        const p = press.current
        if (p && Math.hypot(e.clientX - p.start.x, e.clientY - p.start.y) > 10) cancel()
      },
      onPointerUp: cancel,
      onPointerCancel: cancel,
      onPointerLeave: cancel,
      onContextMenu(e) {
        if (skip(e.target)) return
        e.preventDefault()
        // On a phone the hold already opened it; the browser's own event comes right after.
        if (Date.now() - heldAt.current < 1200) return
        open(e.clientX, e.clientY, title, getActions())
      },
      onClickCapture(e) {
        if (Date.now() < swallowClickUntil.current) {
          swallowClickUntil.current = 0
          e.preventDefault()
          e.stopPropagation()
        }
      },
    }),
    [open]
  )

  return { bind, element: menu ? <RowMenu menu={menu} onClose={close} onGone={gone} /> : null }
}

function RowMenu({ menu, onClose, onGone }) {
  const sheet = phone()
  const boxRef = useRef(null)
  const [pos, setPos] = useState(null)

  // The phone's Back button (the history step was taken when the menu opened).
  useEffect(() => {
    if (!sheet) return undefined
    const onPop = () => {
      if (!window.history.state?.adminPopup) onGone()
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [sheet, onGone])

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  // Keeps the small menu on screen.
  useEffect(() => {
    if (sheet) return
    const w = boxRef.current?.offsetWidth || 220
    const h = boxRef.current?.offsetHeight || menu.actions.length * 40 + 16
    setPos({ left: Math.max(8, Math.min(menu.x, window.innerWidth - w - 8)), top: Math.max(8, Math.min(menu.y, window.innerHeight - h - 8)) })
  }, [sheet, menu])

  const pick = (a) => onClose(() => a.onSelect())

  const items = menu.actions.map((a) => (
    <button key={a.label} type="button" role="menuitem" className={`admin-rowmenu-item ${a.tone === 'danger' ? 'is-danger' : ''}`} onClick={() => pick(a)}>
      {a.icon && <a.icon size={17} aria-hidden="true" />}
      <span>{a.label}</span>
    </button>
  ))

  const root = document.querySelector('.admin-page') || document.body
  return createPortal(
    sheet ? (
      <div className="admin-sheet-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
        <div className="admin-sheet admin-rowmenu-sheet" role="menu" aria-label={menu.title}>
          <span className="admin-sheet-grab" aria-hidden="true" />
          <h2 className="admin-sheet-title">{menu.title}</h2>
          {items}
        </div>
      </div>
    ) : (
      <div className="admin-rowmenu-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()} onContextMenu={(e) => { e.preventDefault(); onClose() }}>
        <div ref={boxRef} className="admin-rowmenu" role="menu" aria-label={menu.title} style={pos ? { left: pos.left, top: pos.top } : { left: menu.x, top: menu.y, visibility: 'hidden' }}>
          {items}
        </div>
      </div>
    ),
    root
  )
}
