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
  const Active = TABS.find((t) => t.id === tab)?.Component

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
              onClick={() => setTab(t.id)}
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
      <main className="admin-main">{Active && <Active />}</main>
    </div>
  )
}
