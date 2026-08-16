import { useState } from 'react'
import SiteSettingsEditor from './sections/SiteSettingsEditor.jsx'
import ProjectsEditor from './sections/ProjectsEditor.jsx'
import SkillsEditor from './sections/SkillsEditor.jsx'
import TestimonialsEditor from './sections/TestimonialsEditor.jsx'
import PostsEditor from './sections/PostsEditor.jsx'

const TABS = [
  { id: 'settings', label: 'Site Settings', Component: SiteSettingsEditor },
  { id: 'projects', label: 'Projects', Component: ProjectsEditor },
  { id: 'skills', label: 'Skills', Component: SkillsEditor },
  { id: 'testimonials', label: 'Testimonials', Component: TestimonialsEditor },
  { id: 'posts', label: 'Blog Posts', Component: PostsEditor },
]

export default function AdminDashboard({ onLogout }) {
  const [tab, setTab] = useState('settings')
  // Every tab a user has actually visited stays mounted (see below) so its
  // useAdminContent() fetch only ever runs once per session instead of
  // re-hitting the GitHub API every time they switch back to it. Tabs never
  // visited yet aren't rendered at all, so a session that only touches one
  // or two tabs still costs one or two fetches, not five upfront.
  const [visited, setVisited] = useState(() => new Set(['settings']))

  function selectTab(id) {
    setTab(id)
    setVisited((prev) => (prev.has(id) ? prev : new Set(prev).add(id)))
  }

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-title">Admin</div>
        <nav>
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`admin-nav-item ${tab === t.id ? 'is-active' : ''}`}
              onClick={() => selectTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </nav>
        <div className="admin-sidebar-footer">
          <a href="/" className="admin-nav-item admin-view-site">View live site ↗</a>
          <button type="button" className="admin-nav-item admin-logout" onClick={onLogout}>
            Log out
          </button>
        </div>
      </aside>
      <main className="admin-main">
        {TABS.map(
          ({ id, Component }) =>
            visited.has(id) && (
              <div key={id} style={{ display: tab === id ? 'block' : 'none' }}>
                <Component />
              </div>
            )
        )}
      </main>
    </div>
  )
}
