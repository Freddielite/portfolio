import { useEffect, useState } from 'react'
import { AlertTriangle, ChevronRight, XCircle } from 'lucide-react'
import { adminFetch } from '../http.js'

// A one-line heads-up at the top of the Overview, and nothing at all when every repo is fine.
// Red: a repo's latest push failed its checks. Amber: a repo needs attention (the push is
// fine but a workflow, for example a scheduled job, failed). It only shows a fresh answer,
// never an old copy that might describe something already fixed. Tapping it opens Repos.
export default function RepoStrip({ go }) {
  const [state, setState] = useState({ failing: [], attention: [] })

  useEffect(() => {
    let live = true
    adminFetch('/api/admin/monitor?step=repos', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!live || !data?.repos) return
        setState({
          failing: data.repos.filter((r) => r.ci === 'failing').map((r) => r.name),
          attention: data.repos.filter((r) => r.ci === 'attention').map((r) => r.name),
        })
      })
      .catch(() => {})
    return () => {
      live = false
    }
  }, [])

  const { failing, attention } = state
  if (!failing.length && !attention.length) return null
  const names = [...failing, ...attention]
  const shown = names.slice(0, 3).join(', ') + (names.length > 3 ? ` and ${names.length - 3} more` : '')
  const parts = []
  if (failing.length) parts.push(`${failing.length} failing`)
  if (attention.length) parts.push(`${attention.length} need${attention.length === 1 ? 's' : ''} attention`)
  const Icon = failing.length ? XCircle : AlertTriangle
  return (
    <button type="button" className={`admin-repo-strip ${failing.length ? '' : 'is-attn'}`} onClick={() => go('repos')}>
      <Icon size={18} aria-hidden="true" />
      <span className="admin-repo-strip-text">
        <strong>{parts.join(' · ')}</strong>
        <span className="admin-hint">{shown}</span>
      </span>
      <ChevronRight size={16} aria-hidden="true" />
    </button>
  )
}
