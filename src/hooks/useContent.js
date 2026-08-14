import { useEffect, useState } from 'react'

// Runs an async fetcher (from src/lib/content.js) and tracks loading state.
// `deps` lets callers refetch when e.g. a slug param changes.
export default function useContent(fetcher, initialValue, deps = []) {
  const [data, setData] = useState(initialValue)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.resolve(fetcher()).then((result) => {
      if (!cancelled) {
        setData(result)
        setLoading(false)
      }
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return [data, loading]
}
