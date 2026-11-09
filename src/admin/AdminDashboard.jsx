import { useCallback, useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import {
  LayoutGrid, SlidersHorizontal, FolderKanban, BarChart3, MessageSquareQuote, PenLine,
  ExternalLink, LogOut, Download, ArrowDown, RefreshCw, Mail,
} from 'lucide-react'
import Overview from './sections/Overview.jsx'
import SiteSettingsEditor from './sections/SiteSettingsEditor.jsx'
import ProjectsEditor from './sections/ProjectsEditor.jsx'
import SkillsEditor from './sections/SkillsEditor.jsx'
import TestimonialsEditor from './sections/TestimonialsEditor.jsx'
import PostsEditor from './sections/PostsEditor.jsx'
import Subscribers from './sections/Subscribers.jsx'
import { startNativeLock } from './nativeLock.js'
import { openInApp } from './native.js'
import { AdminProvider, PanelContext, useAdmin } from './AdminContext.jsx'
import SaveAllDock, { AdminStatusChip } from './SaveAllDock.jsx'
import { followTheme, listenForPhoneIntents } from './native.js'
import { pushIntent, sharedFromPhone } from './intents.js'
import { IS_APP, slide, useKeyboardClass, usePullToRefresh, useTabSwipe, useTuckingHeader } from './app.js'
import TabBar, { MORE, PRIMARY } from './TabBar.jsx'
import OfflineBanner from './OfflineBanner.jsx'
import { hasUnsavedPostWriting } from './usePostBackup.js'
import { useInstallPrompt } from './pwa.js'

const TABS = [
  { id: 'overview', label: 'Overview', short: 'Overview', Icon: LayoutGrid, Component: Overview, blurb: 'How your site is doing and what is left to set up.' },
  { id: 'posts', label: 'Blog posts', short: 'Posts', Icon: PenLine, Component: PostsEditor, blurb: 'Write, schedule and publish posts.' },
  { id: 'subscribers', label: 'Subscribers', short: 'Subscribers', Icon: Mail, Component: Subscribers, blurb: 'Newsletter signups and emailing your posts.' },
  { id: 'projects', label: 'Projects', short: 'Projects', Icon: FolderKanban, Component: ProjectsEditor, blurb: 'The work shown on your home page.' },
  { id: 'settings', label: 'Site settings', short: 'Settings', Icon: SlidersHorizontal, Component: SiteSettingsEditor, blurb: 'Your details, contact links and SEO.' },
  { id: 'skills', label: 'Skills', short: 'Skills', Icon: BarChart3, Component: SkillsEditor, blurb: 'The skill bars in your About section.' },
  { id: 'testimonials', label: 'Testimonials', short: 'Testimonials', Icon: MessageSquareQuote, Component: TestimonialsEditor, blurb: 'Quotes from people you have worked with.' },
]
const byId = Object.fromEntries(TABS.map((t) => [t.id, t]))
// Left-to-right order of the phone's tab bar (then the sections under More).
// Sliding between sections and swiping follow it.
const order = [...PRIMARY, ...MORE]
const LABELS = Object.fromEntries(TABS.map((t) => [t.id, t.label]))
const fromHash = () => {
  const h = window.location.hash.replace('#', '')
  return byId[h] ? h : 'overview'
}
// The app opens on Overview every time, with two exceptions: it was opened
// for something specific (a shortcut, a shared item), or you left unsaved
// post writing behind, in which case it reopens on that post (PostsEditor
// restores it).
function startTab() {
  const h = window.location.hash.replace('#', '')
  if (byId[h]) return h
  if (IS_APP && hasUnsavedPostWriting()) {
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#posts`)
    return 'posts'
  }
  return 'overview'
}

// Find the field to focus after a "Fix" jump. The tab may still be loading,
// so keep looking for a few seconds.
function focusField(target) {
  const started = Date.now()
  const look = () => {
    const el = document.querySelector(`[data-field="${target}"]`)
    if (el && el.offsetParent !== null) {
      el.scrollIntoView({ block: 'center', behavior: 'smooth' })
      el.classList.add('is-flash')
      setTimeout(() => el.classList.remove('is-flash'), 1600)
      el.querySelector('input, textarea, select')?.focus({ preventScroll: true })
      return
    }
    if (Date.now() - started < 4000) setTimeout(look, 120)
  }
  requestAnimationFrame(look)
}

export default function AdminDashboard({ onLogout }) {
  const [tab, setTab] = useState(startTab)
  useEffect(() => {
    startNativeLock() // Android app only: locks after time away
  }, [])
  // Every tab you visit stays mounted, so its content is fetched once per
  // session and unsaved edits survive switching tabs. Tabs you never open are
  // never fetched. The app always loads Overview too, which keeps the badge on
  // its icon up to date.
  const [visited, setVisited] = useState(() => new Set([fromHash(), ...(IS_APP ? ['overview'] : [])]))
  const scrolls = useRef({})
  const tabRef = useRef(tab)
  tabRef.current = tab

  const show = useCallback((id) => {
    if (!byId[id] || id === tabRef.current) return
    const from = tabRef.current
    scrolls.current[from] = window.scrollY
    // In the app, the new section slides in from the side it sits on.
    slide(order.indexOf(id) > order.indexOf(from) ? 'forward' : 'back', () => {
      flushSync(() => {
        setTab(id)
        setVisited((prev) => (prev.has(id) ? prev : new Set(prev).add(id)))
      })
      window.scrollTo(0, scrolls.current[id] || 0)
    })
  }, [])


  // Tabs live in the address (#posts, #skills…) so Back works and a refresh
  // keeps you where you were.
  const go = useCallback(
    (id, target) => {
      if (window.location.hash !== `#${id}`) window.history.pushState(null, '', `#${id}`)
      show(id)
      if (target) focusField(target)
    },
    [show]
  )

  useEffect(() => {
    const onPop = () => show(fromHash())
    window.addEventListener('popstate', onPop)
    window.addEventListener('hashchange', onPop)
    return () => {
      window.removeEventListener('popstate', onPop)
      window.removeEventListener('hashchange', onPop)
    }
  }, [show])

  return (
    <AdminProvider go={go}>
      <Shell tab={tab} go={go} visited={visited} onLogout={onLogout} />
    </AdminProvider>
  )
}

function Shell({ tab, go, visited, onLogout }) {
  const { dirty, confirm, refresh, toast } = useAdmin()
  const install = useInstallPrompt()
  const current = byId[tab]
  const navRef = useRef(null)
  const headerRef = useRef(null)
  const titleRef = useRef(null)
  const header = useTuckingHeader(headerRef, titleRef, tab)

  // Phones: swipe sideways to move between the tab bar's sections, and the
  // tab bar steps aside while the keyboard is open.
  useTabSwipe({ tab, order: PRIMARY, go })
  useKeyboardClass()

  // The status and navigation bar icons follow the theme the admin is showing.
  useEffect(() => followTheme(), [])

  // Shortcuts on the app icon and things shared to the app from other apps.
  const goRef = useRef(go)
  goRef.current = go
  useEffect(() => {
    let stop = () => {}
    let gone = false
    async function onPhoneIntent(i) {
      if (i.kind === 'shortcut') {
        if (i.dest === 'new-post') {
          pushIntent({ kind: 'new-post' })
          goRef.current('posts')
        } else if (i.dest === 'subscribers') {
          goRef.current('subscribers')
        } else if (i.dest === 'health') {
          goRef.current('overview')
          setTimeout(() => document.getElementById('site-health')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 450)
        }
      } else if (i.kind === 'share') {
        pushIntent({ kind: 'share', shared: await sharedFromPhone(i) })
        goRef.current('posts')
      } else if (i.kind === 'link') {
        // A link to the admin opened the app (an email, a chat, a phone alert):
        // go to the section it names, e.g. /admin#subscribers or /admin?focus=health.
        let url
        try {
          url = new URL(i.url)
        } catch {
          return
        }
        const id = url.hash.replace('#', '')
        const health = url.searchParams.get('focus') === 'health'
        goRef.current(byId[id] ? id : 'overview')
        if (health) setTimeout(() => document.getElementById('site-health')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 450)
      }
    }
    listenForPhoneIntents(onPhoneIntent).then((fn) => (gone ? fn() : (stop = fn)))
    return () => {
      gone = true
      stop()
    }
  }, [])

  // Pull to refresh (app only): reloads whatever the current tab shows.
  const pull = usePullToRefresh(async () => {
    try {
      const result = await refresh(tab)
      if (result === false) return
      toast(typeof result === 'string' ? result : 'Up to date')
    } catch (err) {
      toast(err.message || 'Could not refresh. Try again.', { tone: 'error' })
    }
  })

  // On phones (860px and narrower) this list is hidden and the sections live in
  // the tab bar at the bottom (TabBar.jsx). If the list ever scrolls sideways,
  // its edge fades grow with the scroll (the left one appears once you move off
  // the start, the right one fades out as you reach the end) ...
  const updateFade = useCallback(() => {
    const n = navRef.current
    if (!n) return
    const left = Math.max(0, Math.min(n.scrollLeft, 36))
    const right = Math.max(0, Math.min(n.scrollWidth - n.clientWidth - n.scrollLeft, 36))
    n.style.setProperty('--fl', `${left}px`)
    n.style.setProperty('--fr', `${right}px`)
  }, [])

  useEffect(() => {
    updateFade()
    window.addEventListener('resize', updateFade)
    return () => window.removeEventListener('resize', updateFade)
  }, [updateFade])

  // ... and the current section is kept centred in view.
  useEffect(() => {
    const n = navRef.current
    const active = n?.querySelector('.is-active')
    if (!n || !active || n.scrollWidth <= n.clientWidth) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    n.scrollTo({ left: active.offsetLeft - (n.clientWidth - active.offsetWidth) / 2, behavior: reduce ? 'auto' : 'smooth' })
  }, [tab])

  async function logout() {
    if (dirty.size) {
      const where = TABS.filter((t) => dirty.has(t.id)).map((t) => t.label)
      const list = where.length > 1 ? `${where.slice(0, -1).join(', ')} and ${where[where.length - 1]}` : where[0]
      const ok = await confirm({
        title: 'Log out with unsaved changes?',
        body: `Your unsaved changes in ${list} will be lost.`,
        confirmLabel: 'Log out',
        cancelLabel: 'Keep editing',
        tone: 'danger',
      })
      if (!ok) return
    }
    onLogout()
  }

  return (
    <div className="admin-shell">
      <aside
        ref={headerRef}
        className={`admin-sidebar ${header.tucked ? 'is-tucked' : ''} ${header.titleGone ? 'has-title' : ''}`}
        aria-label="Admin"
      >
        <div className="admin-brand-wrap">
          <div className="admin-brand">
            <span className="admin-brand-name">Admin</span>
            {IS_APP && <span className="admin-brand-title" aria-hidden="true">{current.label}</span>}
          </div>
          <AdminStatusChip labels={LABELS} go={go} tab={tab} />
        </div>

        <nav className="admin-side-nav" ref={navRef} onScroll={updateFade} aria-label="Admin sections">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`admin-nav-item ${tab === t.id ? 'is-active' : ''}`}
              aria-current={tab === t.id ? 'page' : undefined}
              onClick={() => go(t.id)}
            >
              <span className="admin-nav-icon">
                <t.Icon size={18} strokeWidth={tab === t.id ? 2.3 : 1.9} aria-hidden="true" />
                {dirty.has(t.id) && <i className="admin-dirty-dot" />}
              </span>
              <span className="admin-nav-label">{t.label}</span>
              {dirty.has(t.id) && <span className="admin-sr">, unsaved changes</span>}
            </button>
          ))}
        </nav>

        <div className="admin-sidebar-footer">
          {install && (
            <button type="button" className="admin-nav-item admin-install" onClick={install}>
              <span className="admin-nav-icon"><Download size={18} aria-hidden="true" /></span>
              <span className="admin-nav-label">Install as app</span>
            </button>
          )}
          <a href="/" target="_blank" rel="noreferrer" className="admin-nav-item admin-view-site" aria-label="View live site" onClick={(e) => { if (window.Capacitor?.isNativePlatform?.()) { e.preventDefault(); openInApp('/') } }}>
            <span className="admin-nav-icon"><ExternalLink size={18} aria-hidden="true" /></span>
            <span className="admin-nav-label">View live site</span>
          </a>
          <button type="button" className="admin-nav-item admin-logout" onClick={logout}>
            <span className="admin-nav-icon"><LogOut size={18} aria-hidden="true" /></span>
            <span className="admin-nav-label">Log out</span>
          </button>
        </div>
      </aside>

      {IS_APP && (
        <div className={`admin-ptr is-${pull.state}`} style={{ '--ptr': `${pull.y}px`, '--ptr-o': Math.min(1, pull.y / 60) }} aria-hidden={pull.state === 'idle'}>
          <span>
            {pull.state === 'refreshing' ? (
              <RefreshCw size={18} className="admin-spin" aria-label="Refreshing" />
            ) : (
              <ArrowDown size={18} aria-hidden="true" />
            )}
          </span>
        </div>
      )}

      <main className="admin-main" style={IS_APP && pull.y ? { transform: `translateY(${pull.y}px)`, transition: pull.state === 'pulling' || pull.state === 'ready' ? 'none' : undefined } : undefined}>
        <OfflineBanner />
        <header className="admin-page-head">
          <h1 ref={titleRef}>{current.label}</h1>
          <p>{current.blurb}</p>
        </header>
        {TABS.map(
          ({ id, Component }) =>
            visited.has(id) && (
              <PanelContext.Provider key={id} value={{ id, active: tab === id }}>
                <div className="admin-panel" hidden={tab !== id}>
                  <Component go={go} />
                </div>
              </PanelContext.Provider>
            )
        )}
      </main>
      <TabBar tabs={TABS} tab={tab} go={go} dirty={dirty} />
      <SaveAllDock labels={LABELS} go={go} />
    </div>
  )
}
