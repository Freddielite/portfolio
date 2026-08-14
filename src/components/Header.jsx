import { Link } from 'react-router-dom'
import ThemeToggle from './ThemeToggle.jsx'
import { useSiteSettings } from '../context/SiteSettingsContext.jsx'

export default function Header() {
  const s = useSiteSettings()

  return (
    <header className="header">
      <Link to="/#top" className="header-mark">
        <span className="header-mark-dot" aria-hidden="true" />
        {s.initials}
      </Link>
      <nav className="header-nav">
        <Link to="/#about">About</Link>
        <Link to="/#skills">Skills</Link>
        <Link to="/#work">Work</Link>
        <Link to="/blog">Blog</Link>
        <Link to="/#contact">Contact</Link>
      </nav>
      <div className="header-actions">
        <ThemeToggle />
        <a href={s.resumeUrl} download className="link-btn link-btn-ghost header-resume">
          CV ↓
        </a>
        <Link to="/#contact" className="btn btn-primary header-cta">Start a project</Link>
      </div>
    </header>
  )
}
