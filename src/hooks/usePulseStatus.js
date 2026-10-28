import { useEffect, useState } from 'react'
import { useSiteSettings } from '../context/SiteSettingsContext.jsx'

const host = (u) => {
  try {
    return new URL(u).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

const STALE_MS = 30 * 60 * 1000
const KNOWN = ['up', 'degraded', 'down']

// Reads a public Pulse status page and returns a lookup: give it a project
// and it returns that project's live monitor (matched by the hostname of the
// project's live URL), or null when there is nothing trustworthy to show.
// Off by default: set pulseApiUrl and pulseStatusToken in /admin.
export default function usePulseStatus(active) {
  const s = useSiteSettings()
  const api = (s.pulseApiUrl || '').trim().replace(/\/$/, '')
  const token = (s.pulseStatusToken || '').trim()
  const [byHost, setByHost] = useState({})

  useEffect(() => {
    if (!active || !api || !token) return
    let stopped = false

    async function load() {
      const ctl = new AbortController()
      const timeout = setTimeout(() => ctl.abort(), 10000)
      try {
        const res = await fetch(`${api}/api/public/status-pages/${encodeURIComponent(token)}`, { signal: ctl.signal })
        if (!res.ok) return
        const data = await res.json()
        const next = {}
        ;(data.monitors || []).forEach((m) => {
          const h = host(m.url)
          if (!h) return
          next[h] = {
            status: m.current_status,
            ms: m.last_response_ms,
            checkedAt: m.last_checked_at,
            uptime30: m.uptime?.['30d'] ?? null,
          }
        })
        if (!stopped) setByHost(next)
      } catch {
        /* Pulse asleep or CORS not allowed: show nothing rather than a wrong state */
      } finally {
        clearTimeout(timeout)
      }
    }

    load()
    const timer = setInterval(() => {
      if (!document.hidden) load()
    }, 60000)
    return () => {
      stopped = true
      clearInterval(timer)
    }
  }, [active, api, token])

  return (project) => {
    const m = byHost[host(project.live || '')]
    if (!m || !KNOWN.includes(m.status)) return null
    if (m.checkedAt && Date.now() - new Date(m.checkedAt).getTime() > STALE_MS) return null
    return m
  }
}
