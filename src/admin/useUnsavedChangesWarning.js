import { useEffect } from 'react'

// Call with the editor's `dirty` boolean. Prompts the browser's native
// "leave site?" dialog on tab close / refresh / outside navigation while
// there are unsaved edits. Doesn't cover in-app tab switches inside
// AdminDashboard — those are handled separately by keeping all editors
// mounted (see AdminDashboard.jsx) so switching tabs never discards state.
export default function useUnsavedChangesWarning(dirty) {
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
