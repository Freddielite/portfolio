import { useCallback, useEffect, useRef, useState } from 'react'
import { Code2, FileUp, ImagePlus, PencilLine, RefreshCw, Rocket, ShieldCheck, UserPlus } from 'lucide-react'
import { adminFetch } from '../http.js'
import { agoText, readCache, writeCache } from '../cache.js'
import { useOnRetry } from '../network.js'

// Overview card: the latest saves (every save is a commit), new signups from
// Wynmail and when the site last finished rebuilding, in one list, newest first.
// Shown from the device cache straight away and refreshed behind the scenes.

const TYPE_LABELS = {
  posts: 'Blog posts',
  drafts: 'Draft posts',
  projects: 'Projects',
  skills: 'Skills',
  testimonials: 'Testimonials',
  siteSettings: 'Site settings',
}
const ICONS = { save: PencilLine, image: ImagePlus, file: FileUp, security: ShieldCheck, code: Code2, deploy: Rocket, signup: UserPlus }
const BUILD_WINDOW = 15 * 60 * 1000 // a save newer than the live site, made in the last 15 minutes, is still building
const SHOWN = 8

const capital = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)

export function describeCommit(message) {
  const msg = String(message || '').split('\n')[0].trim()
  let m
  if ((m = /^admin: update (\w+)/.exec(msg))) return { kind: 'save', title: `${TYPE_LABELS[m[1]] || capital(m[1])} saved` }
  if ((m = /^admin: upload image (.+)/.exec(msg))) return { kind: 'image', title: 'Image uploaded', detail: m[1] }
  if (/^admin: replace public\/cv\.pdf/.test(msg)) return { kind: 'file', title: 'CV replaced' }
  if ((m = /^admin: replace (.+)/.exec(msg))) return { kind: 'file', title: 'File replaced', detail: m[1] }
  if ((m = /^admin: (add|remove) .*device/.exec(msg))) return { kind: 'security', title: m[1] === 'add' ? 'Unlock device added' : 'Unlock device removed' }
  if ((m = /^admin:\s*(.+)/.exec(msg))) return { kind: 'save', title: capital(m[1]) }
  return { kind: 'code', title: 'Code update', detail: msg }
}

// Turns the three sources into one list. Each save also says whether it is on
// the live site yet, by comparing it with the commit the live build was made from.
export function buildActivity({ commits = [], build = null, recent = [] }, now = Date.now()) {
  const live = build?.commit || null
  const liveIndex = live ? commits.findIndex((c) => c.sha === live) : -1
  const builtAt = build?.builtAt ? Date.parse(build.builtAt) : null
  const items = []

  commits.forEach((c, i) => {
    const at = Date.parse(c.date)
    if (!Number.isFinite(at)) return
    const d = describeCommit(c.message)
    let deploy = null
    if (live && c.sha === live) deploy = 'live'
    else if (liveIndex > -1 ? i < liveIndex : builtAt && at > builtAt) deploy = now - at < BUILD_WINDOW ? 'building' : 'not-live'
    items.push({ id: `c-${c.sha}`, ...d, at, deploy })
  })

  if (builtAt && Number.isFinite(builtAt)) {
    items.push({ id: `b-${build.commit || builtAt}`, kind: 'deploy', title: 'Site finished rebuilding', at: builtAt })
  }

  for (const c of recent) {
    const at = Date.parse(c.created_at)
    if (!Number.isFinite(at)) continue
    items.push({
      id: `s-${c.email}-${at}`,
      kind: 'signup',
      title: 'New subscriber',
      detail: c.email,
      at,
      status: c.status && c.status !== 'subscribed' ? c.status : null,
    })
  }

  return items.sort((a, b) => b.at - a.at).slice(0, SHOWN)
}

async function json(res, what) {
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.error || `Could not load ${what}.`)
  return body
}

async function fetchActivity() {
  const [hist, build, subs] = await Promise.allSettled([
    adminFetch('/api/admin/history?type=all', { cache: 'no-store' }).then((r) => json(r, 'recent saves')),
    fetch(`/build.json?ts=${Date.now()}`, { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)),
    adminFetch('/api/admin/subscribers?recent=1', { cache: 'no-store' }).then((r) => json(r, 'signups')),
  ])
  if (hist.status === 'rejected' && subs.status === 'rejected') throw hist.reason
  return {
    commits: hist.status === 'fulfilled' ? hist.value.commits || [] : null,
    build: build.status === 'fulfilled' ? build.value : null,
    recent: subs.status === 'fulfilled' ? subs.value.recent || [] : null,
  }
}

function useNow(every = 30000) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), every)
    return () => clearInterval(t)
  }, [every])
  return now
}

export default function RecentActivity() {
  const cached = useRef(readCache('activity'))
  const [state, setState] = useState(() => ({
    loading: true,
    error: null,
    sources: cached.current?.value || null,
    at: cached.current?.at || null,
    fresh: false,
  }))
  const now = useNow()
  const busy = useRef(false)

  const load = useCallback(async () => {
    if (busy.current) return
    busy.current = true
    setState((s) => ({ ...s, loading: true, error: null }))
    try {
      const got = await fetchActivity()
      setState((s) => {
        // A source that failed this time keeps what it showed before.
        const prev = s.sources || {}
        const sources = {
          commits: got.commits ?? prev.commits ?? [],
          build: got.build ?? prev.build ?? null,
          recent: got.recent ?? prev.recent ?? [],
        }
        writeCache('activity', sources)
        return { loading: false, error: null, sources, at: Date.now(), fresh: true }
      })
    } catch (err) {
      setState((s) => ({ ...s, loading: false, error: err.message }))
    } finally {
      busy.current = false
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])
  useOnRetry(load)

  // Pull to refresh on the Overview, coming back to the app, and a little
  // after every save (its commit shows up here as "Building").
  useEffect(() => {
    let t = 0
    const soon = () => {
      clearTimeout(t)
      t = setTimeout(load, 2500)
    }
    const onVisible = () => document.visibilityState === 'visible' && load()
    window.addEventListener('admin:refresh-health', load)
    window.addEventListener('admin:saved', soon)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearTimeout(t)
      window.removeEventListener('admin:refresh-health', load)
      window.removeEventListener('admin:saved', soon)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [load])

  const items = state.sources ? buildActivity(state.sources, now) : []
  const building = items.some((i) => i.deploy === 'building')

  // While something is building, check every 20 seconds until it is live.
  useEffect(() => {
    if (!building) return
    const t = setInterval(load, 20000)
    return () => clearInterval(t)
  }, [building, load])

  const hint = state.loading
    ? state.sources
      ? `Updated ${agoText(state.at, now)}, updating…`
      : 'Loading…'
    : state.error && state.sources
      ? `Could not update, showing ${agoText(state.at, now)}`
      : 'Saves, signups and rebuilds'

  return (
    <section className="admin-card admin-activity-card" aria-busy={state.loading}>
      <div className="admin-card-header">
        <div>
          <h2 className="admin-card-title">Recent activity</h2>
          <p className="admin-hint">{hint}</p>
        </div>
        <button type="button" className="admin-icon-btn" onClick={load} disabled={state.loading} aria-label="Refresh recent activity">
          <RefreshCw size={16} className={state.loading ? 'admin-spin' : ''} aria-hidden="true" />
        </button>
      </div>

      {state.error && !state.sources && <p className="admin-error">{state.error}</p>}

      {!state.sources && state.loading ? (
        <ul className="admin-activity" aria-hidden="true">
          {[0, 1, 2].map((i) => <li key={i} className="admin-skeleton admin-activity-skeleton" />)}
        </ul>
      ) : state.sources && !items.length ? (
        <p className="admin-hint">Nothing yet. Saves, new subscribers and rebuilds show up here.</p>
      ) : (
        <ul className="admin-activity">
          {items.map((item) => {
            const Icon = ICONS[item.kind] || PencilLine
            return (
              <li key={item.id} className={`is-${item.kind}`}>
                <span className="admin-activity-icon" aria-hidden="true"><Icon size={16} /></span>
                <span className="admin-activity-text">
                  <strong>{item.title}</strong>
                  {item.detail && <span className="admin-hint">{item.detail}</span>}
                </span>
                <span className="admin-activity-meta">
                  <time dateTime={new Date(item.at).toISOString()} className="admin-hint">{agoText(item.at, now)}</time>
                  {item.deploy === 'live' && <span className="admin-badge is-published">Live</span>}
                  {item.deploy === 'building' && <span className="admin-badge is-accent admin-badge-building">Building</span>}
                  {item.deploy === 'not-live' && <span className="admin-badge is-warn" title="This save never reached the live site. Check the deploy in Vercel.">Not live</span>}
                  {item.status && <span className="admin-badge">{item.status}</span>}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
