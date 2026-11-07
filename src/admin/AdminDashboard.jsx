import { useCallback, useEffect, useRef, useState } from 'react'
import {
  LayoutGrid, SlidersHorizontal, FolderKanban, BarChart3, MessageSquareQuote, PenLine,
  ExternalLink, LogOut, Download,
} from 'lucide-react'
import Overview from './sections/Overview.jsx'
import SiteSettingsEditor from './sections/SiteSettingsEditor.jsx'
import ProjectsEditor from './sections/ProjectsEditor.jsx'
import SkillsEditor from './sections/SkillsEditor.jsx'
import TestimonialsEditor from './sections/TestimonialsEditor.jsx'
import PostsEditor from './sections/PostsEditor.jsx'
import { AdminProvider, PanelContext, useAdmin } from './AdminContext.jsx'
import { useInstallPrompt } from './pwa.js'

const TABS = [
  { id: 'overview', label: 'Overview', short: 'Overview', Icon: LayoutGrid, Component: Overview, blurb: 'How your site is doing and what is left to set up.' },
  { id: 'posts', label: 'Blog posts', short: 'Posts', Icon: PenLine, Component: PostsEditor, blurb: 'Write, schedule and publish posts.' },
  { id: 'projects', label: 'Projects', short: 'Projects', Icon: FolderKanban, Component: ProjectsEditor, blurb: 'The work shown on your home page.' },
  { id: 'settings', label: 'Site settings', short: 'Settings', Icon: SlidersHorizontal, Component: SiteSettingsEditor, blurb: 'Your details, contact links and SEO.' },
  { id: 'skills', label: 'Skills', short: 'Skills', Icon: BarChart3, Component: SkillsEditor, blurb: 'The skill bars in your About section.' },
  { id: 'testimonials', label: 'Testimonials', short: 'Testimonials', Icon: MessageSquareQuote, Component: TestimonialsEditor, blurb: 'Quotes from people you have worked with.' },
]
const byId = Object.fromEntries(TABS.map((t) => [t.id, t]))
const fromHash = () => {
  const h = window.location.hash.replace('#', '')
  return byId[h] ? h : 'overview'
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
  const [tab, setTab] = useState(fromHash)
  // Every tab you visit stays mounted, so its content is fetched once per
  // session and unsaved edits survive switching tabs. Tabs you never open are
  // never fetched.
  const [visited, setVisited] = useState(() => new Set([fromHash()]))
  const scrolls = useRef({})
  const tabRef = useRef(tab)
  tabRef.current = tab

  const show = useCallback((id) => {
    if (!byId[id]) return
    if (id !== tabRef.current) scrolls.current[tabRef.current] = window.scrollY
    setTab(id)
    setVisited((prev) => (prev.has(id) ? prev : new Set(prev).add(id)))
    requestAnimationFrame(() => window.scrollTo(0, scrolls.current[id] || 0))
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
  const { dirty, confirm } = useAdmin()
  const install = useInstallPrompt()
  const current = byId[tab]
  const navRef = useRef(null)

  // Same pattern as Wynmail: on phones the sidebar folds into a header and the
  // sections become one row of pills that scrolls sideways. The edge fades
  // grow with the scroll (the left one appears once you move off the start,
  // the right one fades out as you reach the end) ...
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
      <aside className="admin-sidebar" aria-label="Admin">
        <div className="admin-brand">Admin</div>

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
          <a href="/" target="_blank" rel="noreferrer" className="admin-nav-item admin-view-site" aria-label="View live site">
            <span className="admin-nav-icon"><ExternalLink size={18} aria-hidden="true" /></span>
            <span className="admin-nav-label">View live site</span>
          </a>
          <button type="button" className="admin-nav-item admin-logout" onClick={logout}>
            <span className="admin-nav-icon"><LogOut size={18} aria-hidden="true" /></span>
            <span className="admin-nav-label">Log out</span>
          </button>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-page-head">
          <h1>{current.label}</h1>
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
    </div>
  )
}
