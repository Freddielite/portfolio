import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { haptic } from './native.js'

// The admin's own pop-up, shared by Picker (dropdowns) and DatePicker. On
// phones it is a sheet from the bottom with big targets in thumb reach, and
// the phone's Back closes it. On wider screens it is a small panel under (or
// above) the button that opened it; a click elsewhere closes it.

const phone = () => window.matchMedia('(max-width: 860px)').matches

// const popup = usePopup(buttonRef)
// popup.open, popup.asSheet, popup.show(), popup.hide(focusButton = true)
export function usePopup(btnRef) {
  const [open, setOpen] = useState(false)
  const [asSheet, setAsSheet] = useState(false)

  const show = useCallback(() => {
    const sheet = phone()
    setAsSheet(sheet)
    if (sheet) {
      haptic.tap()
      // A step in the history, so the phone's Back closes it.
      window.history.pushState({ ...(window.history.state || {}), adminPopup: true }, '', window.location.href)
    }
    setOpen(true)
  }, [])

  const hide = useCallback(
    (focusButton = true) => {
      if (asSheet && window.history.state?.adminPopup) window.history.back()
      setOpen(false)
      if (focusButton) btnRef.current?.focus({ preventScroll: true })
    },
    [asSheet, btnRef]
  )

  useEffect(() => {
    if (!open || !asSheet) return
    const onPop = () => {
      if (!window.history.state?.adminPopup) setOpen(false)
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [open, asSheet])

  return { open, asSheet, show, hide }
}

// The surface. `children` is a function (close) => content: call close(fn) to
// play the closing animation (on phones) and then run fn.
export function PopupSurface({ asSheet, label, anchor, onClose, className = '', children }) {
  return asSheet ? (
    <Sheet label={label} onClose={onClose} className={className}>
      {children}
    </Sheet>
  ) : (
    <Menu anchor={anchor} onClose={onClose} className={className}>
      {children}
    </Menu>
  )
}

function Sheet({ label, onClose, className, children }) {
  const [closing, setClosing] = useState(false)
  const close = useCallback((fn) => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    setClosing(true)
    setTimeout(fn, reduce ? 0 : 160)
  }, [])
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])
  return createPortal(
    <div className={`admin-sheet-backdrop ${closing ? 'is-closing' : ''}`} onMouseDown={(e) => e.target === e.currentTarget && close(onClose)}>
      <div className={`admin-sheet admin-popup-sheet ${className}`} role="dialog" aria-modal="true" aria-label={label}>
        <span className="admin-sheet-grab" aria-hidden="true" />
        {label && <h2 className="admin-sheet-title">{label}</h2>}
        {children(close)}
      </div>
    </div>,
    document.querySelector('.admin-page') || document.body
  )
}

function Menu({ anchor, onClose, className, children }) {
  const boxRef = useRef(null)
  const [up, setUp] = useState(false)

  // Opens upward when there is no room below.
  useEffect(() => {
    const r = anchor.current?.getBoundingClientRect()
    const h = boxRef.current?.offsetHeight || 0
    if (r && r.bottom + h + 12 > window.innerHeight && r.top > h + 12) setUp(true)
  }, [anchor])

  // A click anywhere else closes it.
  useEffect(() => {
    const onDown = (e) => {
      if (!boxRef.current?.contains(e.target) && !anchor.current?.contains(e.target)) onClose(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [anchor, onClose])

  return (
    <div ref={boxRef} className={`admin-picker-menu ${up ? 'is-up' : ''} ${className}`}>
      {children((fn) => fn())}
    </div>
  )
}
