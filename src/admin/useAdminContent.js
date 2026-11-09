import { adminFetch } from './http.js'
import { useCallback, useEffect, useState } from 'react'
import { publishContent } from './contentBus.js'
import { useOnRetry } from './network.js'

// Loads content/<type>.json through the API and knows how to save it back.
// Tracks the file's git `sha` so the API can detect if the file changed
// underneath us (e.g. edited in two tabs or pushed from the terminal) instead
// of silently overwriting. `optional` types (like drafts) start empty when the
// file does not exist yet.
export default function useAdminContent(type, { optional = false } = {}) {
  const [data, setData] = useState(null)
  const [sha, setSha] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [conflict, setConflict] = useState(false)
  const [savedAt, setSavedAt] = useState(null)
  const [commit, setCommit] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    setConflict(false)
    try {
      const res = await adminFetch(`/api/admin/content?type=${type}`, { cache: 'no-store' })
      const body = await res.json().catch(() => ({}))
      if (res.status === 404 && optional) {
        setData([])
        setSha(null)
        publishContent(type, [])
        return
      }
      if (!res.ok) throw new Error(body.error || 'Failed to load content.')
      setData(body.data)
      setSha(body.sha)
      publishContent(type, body.data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [type, optional])

  useEffect(() => {
    load()
  }, [load])

  // Retry after being offline: load again if nothing came through. A tab that
  // already has content is left alone, so unsaved edits are never replaced.
  const hasData = data !== null
  useOnRetry(() => {
    if (!hasData) load()
  })

  const save = useCallback(
    async (newData) => {
      setSaving(true)
      setError(null)
      setConflict(false)
      try {
        const res = await adminFetch(`/api/admin/content?type=${type}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: newData, sha }),
        })
        const body = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(body.error || 'Failed to save.')
        setData(newData)
        setSha(body.sha || sha)
        publishContent(type, newData)
        setCommit(body.commit || null)
        setSavedAt(Date.now())
        window.dispatchEvent(new CustomEvent('admin:saved', { detail: { type, commit: body.commit || null } }))
        return true
      } catch (err) {
        if (/\b409\b|does not match/i.test(err.message)) {
          setConflict(true)
          setError('This content was changed somewhere else (another tab, or a push from your computer) since you opened it.')
        } else {
          setError(err.message)
        }
        return false
      } finally {
        setSaving(false)
      }
    },
    [type, sha]
  )

  return { data, setData, loading, saving, error, conflict, savedAt, commit, save, reload: load }
}
