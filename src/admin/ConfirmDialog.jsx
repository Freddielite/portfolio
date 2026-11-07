import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, HelpCircle } from 'lucide-react'

// The admin's own confirm dialog, used instead of the browser's confirm().
// A centred card on wide screens, a bottom sheet on phones. Esc and a tap on
// the backdrop cancel; Tab stays inside; focus goes back where it was after.
// Destructive dialogs (tone "danger") start focused on Cancel, so a stray Enter
// never deletes anything.
export default function ConfirmDialog({ request, onClose }) {
  const [closing, setClosing] = useState(false)
  const box = useRef(null)
  const cancelRef = useRef(null)
  const okRef = useRef(null)
  const returnTo = useRef(null)
  const danger = request.tone === 'danger'

  function finish(result) {
    if (closing) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    setClosing(true)
    setTimeout(() => {
      onClose(result)
      returnTo.current?.focus?.({ preventScroll: true })
    }, reduce ? 0 : 160)
  }

  useEffect(() => {
    returnTo.current = request.returnTo
    ;(danger ? cancelRef : okRef).current?.focus()
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevOverflow
    }
  }, [danger, request.returnTo])

  function onKeyDown(e) {
    if (e.key === 'Escape') {
      e.stopPropagation()
      finish(false)
      return
    }
    if (e.key !== 'Tab') return
    const items = box.current.querySelectorAll('button:not(:disabled)')
    const first = items[0]
    const last = items[items.length - 1]
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }

  const Icon = danger ? AlertTriangle : HelpCircle

  return (
    <div
      className={`admin-dialog-backdrop ${closing ? 'is-closing' : ''}`}
      onMouseDown={(e) => e.target === e.currentTarget && finish(false)}
      onKeyDown={onKeyDown}
    >
      <div
        ref={box}
        className={`admin-dialog ${danger ? 'is-danger' : ''}`}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="admin-dialog-title"
        aria-describedby={request.body ? 'admin-dialog-body' : undefined}
      >
        <span className="admin-dialog-grab" aria-hidden="true" />
        <div className="admin-dialog-icon" aria-hidden="true"><Icon size={20} /></div>
        <h2 id="admin-dialog-title">{request.title}</h2>
        {request.body && <p id="admin-dialog-body">{request.body}</p>}
        <div className="admin-dialog-actions">
          <button ref={cancelRef} type="button" className="admin-btn-ghost" onClick={() => finish(false)}>
            {request.cancelLabel || 'Cancel'}
          </button>
          <button
            ref={okRef}
            type="button"
            className={danger ? 'admin-btn admin-btn-solid-danger' : 'admin-btn'}
            onClick={() => finish(true)}
          >
            {request.confirmLabel || 'Continue'}
          </button>
        </div>
      </div>
    </div>
  )
}
