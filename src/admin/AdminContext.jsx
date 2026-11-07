import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { Check, AlertTriangle } from 'lucide-react'
import ConfirmDialog from './ConfirmDialog.jsx'

// Shared state for the whole admin: which tabs have unsaved edits (for the dots
// in the navigation and the log-out warning), a small toast with an optional
// action (Undo), and a way to jump to a tab and focus a field.
const AdminContext = createContext(null)
// Each tab's panel says which tab it is and whether it is on screen.
export const PanelContext = createContext({ id: null, active: true })

export const useAdmin = () => useContext(AdminContext)
export const usePanel = () => useContext(PanelContext)

export function AdminProvider({ go, children }) {
  const [dirty, setDirty] = useState(() => new Set())
  const [toastItem, setToastItem] = useState(null)
  const timer = useRef(0)

  const reportDirty = useCallback((id, isDirty) => {
    if (!id) return
    setDirty((prev) => {
      if (prev.has(id) === !!isDirty) return prev
      const next = new Set(prev)
      if (isDirty) next.add(id)
      else next.delete(id)
      return next
    })
  }, [])

  const toast = useCallback((message, { tone = 'ok', action = null, duration } = {}) => {
    clearTimeout(timer.current)
    setToastItem({ id: Date.now(), message, tone, action })
    timer.current = setTimeout(() => setToastItem(null), duration || (action ? 6000 : 3200))
  }, [])

  useEffect(() => () => clearTimeout(timer.current), [])

  // confirm({ title, body, confirmLabel, cancelLabel, tone }) -> Promise<boolean>
  // One dialog at a time: a new request answers the open one with "no".
  const [dialog, setDialog] = useState(null)
  const dialogRef = useRef(null)
  const confirm = useCallback((request) => {
    return new Promise((resolve) => {
      dialogRef.current?.resolve(false)
      const next = { ...request, resolve, id: Date.now(), returnTo: document.activeElement }
      dialogRef.current = next
      setDialog(next)
    })
  }, [])
  const closeDialog = useCallback((result) => {
    const d = dialogRef.current
    dialogRef.current = null
    setDialog(null)
    d?.resolve(result)
  }, [])

  const value = useMemo(() => ({ dirty, reportDirty, toast, go, confirm }), [dirty, reportDirty, toast, go, confirm])

  return (
    <AdminContext.Provider value={value}>
      {children}
      {dialog && <ConfirmDialog key={dialog.id} request={dialog} onClose={closeDialog} />}
      <div className="admin-toast-wrap" role="status" aria-live="polite">
        {toastItem && (
          <div className={`admin-toast is-${toastItem.tone}`} key={toastItem.id}>
            {toastItem.tone === 'error' ? <AlertTriangle size={16} aria-hidden="true" /> : <Check size={16} aria-hidden="true" />}
            <span>{toastItem.message}</span>
            {toastItem.action && (
              <button
                type="button"
                onClick={() => {
                  toastItem.action.onClick()
                  setToastItem(null)
                }}
              >
                {toastItem.action.label}
              </button>
            )}
          </div>
        )}
      </div>
    </AdminContext.Provider>
  )
}
