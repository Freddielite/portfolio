import { useEffect, useState } from 'react'

// After a save, the admin knows the commit it just made. The site writes its own
// commit into /build.json on every build, so polling that file tells us when the
// new version is live: 'deploying' -> 'live'. If the file never shows the commit
// (for example outside Vercel) it gives up quietly with 'unknown'.
const store = new Map() // commit -> { status, listeners, timer }

function start(commit) {
  const entry = { status: 'deploying', listeners: new Set(), timer: null, started: Date.now() }
  store.set(commit, entry)
  const set = (status) => {
    entry.status = status
    entry.listeners.forEach((fn) => fn(status))
  }
  async function poll() {
    try {
      const res = await fetch(`/build.json?ts=${Date.now()}`, { cache: 'no-store' })
      if (res.ok) {
        const info = await res.json()
        if (info.commit && info.commit === commit) {
          set('live')
          return
        }
      }
    } catch {
      /* keep polling */
    }
    if (Date.now() - entry.started > 5 * 60 * 1000) {
      set('unknown')
      return
    }
    entry.timer = setTimeout(poll, 5000)
  }
  entry.timer = setTimeout(poll, 4000)
  return entry
}

export default function useDeployStatus(commit) {
  const [status, setStatus] = useState(commit ? store.get(commit)?.status || 'deploying' : 'idle')

  useEffect(() => {
    if (!commit) {
      setStatus('idle')
      return
    }
    const entry = store.get(commit) || start(commit)
    setStatus(entry.status)
    entry.listeners.add(setStatus)
    return () => entry.listeners.delete(setStatus)
  }, [commit])

  return status
}
