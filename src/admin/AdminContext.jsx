import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { Check, AlertTriangle } from 'lucide-react'
import ConfirmDialog from './ConfirmDialog.jsx'
import ImageCropper from './ImageCropper.jsx'
import { confirmIdentity, haptic } from './native.js'

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
  // Pass `secure: true` for something that cannot be undone: on the phone the
  // fingerprint is asked for once more after the person says yes.
  const toastRef = useRef(null)
  toastRef.current = toast
  const confirm = useCallback(async (request) => {
    const yes = await new Promise((resolve) => {
      dialogRef.current?.resolve(false)
      const next = { ...request, resolve, id: Date.now(), returnTo: document.activeElement }
      dialogRef.current = next
      setDialog(next)
    })
    if (!yes) return false
    if (request.secure && !(await confirmIdentity(request.secureReason || request.title || 'Confirm it is you'))) {
      toastRef.current?.('Not confirmed, so nothing was changed.', { tone: 'error' })
      return false
    }
    if (request.tone === 'danger') haptic.warn()
    return true
  }, [])
  const closeDialog = useCallback((result) => {
    const d = dialogRef.current
    dialogRef.current = null
    setDialog(null)
    d?.resolve(result)
  }, [])

  // editImage(file) -> Promise<File | null>: crop and rotate before uploading.
  // Resolves with the file to upload (the original if nothing changed) or
  // null if you cancelled. GIFs and non-images pass straight through.
  const [imageJob, setImageJob] = useState(null)
  const imageJobRef = useRef(null)
  const editImage = useCallback((file) => {
    if (!file || !file.type?.startsWith('image/') || file.type === 'image/gif' || typeof createImageBitmap !== 'function') {
      return Promise.resolve(file)
    }
    return new Promise((resolve) => {
      imageJobRef.current?.resolve(null)
      const job = { file, resolve, id: Date.now() }
      imageJobRef.current = job
      setImageJob(job)
    })
  }, [])
  const closeImageJob = useCallback((result) => {
    const job = imageJobRef.current
    imageJobRef.current = null
    setImageJob(null)
    job?.resolve(result)
  }, [])

  // Pull to refresh (installed app): each tab registers what refreshing means.
  const refreshers = useRef(new Map())
  const registerRefresh = useCallback((id, fn) => {
    refreshers.current.set(id, fn)
    return () => {
      if (refreshers.current.get(id) === fn) refreshers.current.delete(id)
    }
  }, [])
  const refresh = useCallback((id) => refreshers.current.get(id)?.(), [])

  // Every editor tab tells the admin where it stands (unsaved edits, saving, a problem)
  // and hands over what Save and Discard do. The Save all dock and the status chip
  // read this, so they show the same on every tab. The map is kept in a ref and the
  // version below changes only when something visible changed, to avoid extra renders.
  const tabs = useRef(new Map())
  const [tabsVersion, setTabsVersion] = useState(0)
  const publishTab = useCallback((id, info) => {
    const sig = (t) => (t ? [t.dirty, t.saving, t.blocked, t.error, t.conflict, t.savedAt, t.restored, t.errors.join('|')].join('~') : '')
    const prev = tabs.current.get(id)
    tabs.current.set(id, info)
    if (sig(prev) !== sig(info)) setTabsVersion((v) => v + 1)
  }, [])
  const dropTab = useCallback((id) => {
    if (tabs.current.delete(id)) setTabsVersion((v) => v + 1)
  }, [])

  const value = useMemo(
    () => ({ dirty, reportDirty, toast, go, confirm, editImage, registerRefresh, refresh, tabs: tabs.current, tabsVersion, publishTab, dropTab }),
    [dirty, reportDirty, toast, go, confirm, editImage, registerRefresh, refresh, tabsVersion, publishTab, dropTab]
  )

  return (
    <AdminContext.Provider value={value}>
      {children}
      {dialog && <ConfirmDialog key={dialog.id} request={dialog} onClose={closeDialog} />}
      {imageJob && <ImageCropper key={imageJob.id} file={imageJob.file} onDone={closeImageJob} />}
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

// Registers what "pull to refresh" does on the current tab. `fn` may return
// false (cancelled, no message) or a string to show instead of "Up to date".
export function useRefresh(fn) {
  const { id } = usePanel()
  const admin = useAdmin()
  const ref = useRef(fn)
  ref.current = fn
  const register = admin?.registerRefresh
  useEffect(() => {
    if (!register || !id) return
    const handler = () => ref.current()
    return register(id, handler)
  }, [register, id])
}

// The usual editor case: reload from GitHub, asking first if that would
// replace unsaved edits.
export function useReloadOnPull(dirty, reload) {
  const admin = useAdmin()
  useRefresh(async () => {
    if (dirty) {
      const ok = await admin.confirm({
        title: 'Load the latest version?',
        body: 'Your unsaved edits on this tab are replaced with what is saved on GitHub now.',
        confirmLabel: 'Load latest',
        tone: 'danger',
      })
      if (!ok) return false
    }
    await reload()
  })
}
