import { useState } from 'react'
import ProjectCard from '../../components/ProjectCard.jsx'
import usePulseStatus from '../../hooks/usePulseStatus.js'

// The real public project card, fed with the project you are editing. It updates as
// you type, before anything is saved. Visitors can pick light or dark, so you can too.
export default function ProjectPreview({ project }) {
  const [theme, setTheme] = useState(() => (typeof document !== 'undefined' && document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'))
  const statusFor = usePulseStatus(true)

  return (
    <section className="admin-preview" aria-label="Live preview of this project">
      <div className="admin-preview-head">
        <div>
          <h3>Live preview</h3>
          <p className="admin-hint">The card as visitors see it. Updates as you type.</p>
        </div>
        <div className="admin-preview-theme" role="group" aria-label="Preview theme">
          {['light', 'dark'].map((t) => (
            <button key={t} type="button" className={theme === t ? 'on' : ''} aria-pressed={theme === t} onClick={() => setTheme(t)}>
              {t === 'light' ? 'Light' : 'Dark'}
            </button>
          ))}
        </div>
      </div>
      <div className="site-scope admin-preview-stage" data-theme={theme}>
        {project ? (
          <div className="admin-preview-card">
            <ProjectCard project={project} status={statusFor(project)} />
          </div>
        ) : (
          <p className="admin-preview-empty">Open a project to see how it looks on your site.</p>
        )}
      </div>
      {project?.hidden && <p className="admin-hint admin-preview-note">This project is hidden, so it is not on your site right now.</p>}
      {project?.featured && !project.hidden && <p className="admin-hint admin-preview-note">Featured projects show wider on large screens. This is the standard card width.</p>}
    </section>
  )
}
