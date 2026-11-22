import { useEffect, useState } from 'react'
import { ChevronRight, XCircle } from 'lucide-react'
import { adminFetch } from '../http.js'

// A one-line heads-up at the top of the Overview when a repo's latest push is failing,
// and nothing at all otherwise. It only shows a fresh answer (never an old copy that
// might say "failing" about something already fixed). Tapping it opens Repos.
export default function RepoStrip({ go }) {
  const [failing, setFailing] = useState([])

  useEffect(() => {
    let live = true
    adminFetch('/api/admin/monitor?step=repos', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (live && data?.repos) setFailing(data.repos.filter((r) => r.ci === 'failing').map((r) => r.name))
      })
      .catch(() => {})
    return () => {
      live = false
    }
  }, [])

  if (!failing.length) return null
  const shown = failing.slice(0, 3).join(', ') + (failing.length > 3 ? ` and ${failing.length - 3} more` : '')
  return (
    <button type="button" className="admin-repo-strip" onClick={() => go('repos')}>
      <XCircle size={18} aria-hidden="true" />
      <span className="admin-repo-strip-text">
        <strong>{failing.length === 1 ? '1 repo is failing its checks' : `${failing.length} repos are failing their checks`}</strong>
        <span className="admin-hint">{shown}</span>
      </span>
      <ChevronRight size={16} aria-hidden="true" />
    </button>
  )
}
