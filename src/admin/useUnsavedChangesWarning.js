import { useContext, useEffect } from 'react'
import { PanelContext, useAdmin } from './AdminContext.jsx'

// Call with the editor's `dirty` boolean. While there are unsaved edits it
// (1) asks the browser to warn before closing or refreshing the page and
// (2) tells the admin shell, which shows a dot on that tab in the navigation
// and warns before logging out. Switching tabs inside the admin is always safe:
// every visited tab stays mounted, so nothing is thrown away.
export default function useUnsavedChangesWarning(dirty) {
  const { id } = useContext(PanelContext)
  const admin = useAdmin()
  const report = admin?.reportDirty

  useEffect(() => {
    report?.(id, !!dirty)
  }, [report, id, dirty])

  useEffect(() => () => report?.(id, false), [report, id])

  useEffect(() => {
    if (!dirty) return
    function handler(e) {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty])
}
