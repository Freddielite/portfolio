import { useCallback, useEffect, useState } from 'react'

// Loads src/data/<type>.json through the API and knows how to save it back.
// Tracks the file's git `sha` so the API can detect if the file changed
// underneath us (e.g. edited in two tabs) instead of silently overwriting.
export default function useAdminContent(type) {
  const [data, setData] = useState(null)
  const [sha, setSha] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [savedAt, setSavedAt] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/content?type=${type}`)
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || 'Failed to load content.')
      setData(body.data)
      setSha(body.sha)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [type])

  useEffect(() => {
    load()
  }, [load])

  const save = useCallback(
    async (newData) => {
      setSaving(true)
      setError(null)
      try {
        const res = await fetch(`/api/admin/content?type=${type}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: newData, sha }),
        })
        const body = await res.json()
        if (!res.ok) throw new Error(body.error || 'Failed to save.')
        setData(newData)
        setSha(body.sha || sha)
        setSavedAt(Date.now())
        return true
      } catch (err) {
        setError(err.message)
        return false
      } finally {
        setSaving(false)
      }
    },
    [type, sha]
  )

  return { data, setData, loading, saving, error, savedAt, save, reload: load }
}
