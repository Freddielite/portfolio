import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Menu, X, Search } from 'lucide-react'
import ThemeToggle from './ThemeToggle.jsx'
import { useSiteSettings } from '../context/SiteSettingsContext.jsx'

const NAV_LINKS = [
  { to: '/#about', label: 'About' },
  { to: '/#skills', label: 'Skills' },
  { to: '/#work', label: 'Work' },
  { to: '/blog', label: 'Blog' },
  { to: '/changelog', label: 'Changelog' },
  { to: '/#contact', label: 'Contact' },
]

function openCommandPalette() {
  window.dispatchEvent(new CustomEvent('open-command-palette'))
}

export default function Header() {
  const s = useSiteSettings()
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()

  // Close the mobile menu whenever the route/hash changes.
  useEffect(() => {
    setMenuOpen(false)
  }, [location])

  // Lock background scroll while the mobile menu is open.
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  return (
    <header className="header">
      <Link to="/#top" className="header-mark">
        <span className="header-mark-dot" aria-hidden="true" />
        {s.initials}
      </Link>

      <nav className="header-nav header-nav-desktop">
        {NAV_LINKS.map((link) => (
          <Link key={link.to} to={link.to}>{link.label}</Link>
        ))}
      </nav>

      <div className="header-actions header-actions-desktop">
        <button type="button" className="header-search-btn" onClick={openCommandPalette} aria-label="Search (Cmd+K)">
          <Search size={15} />
          <kbd>⌘K</kbd>
        </button>
        <ThemeToggle />
        <a
          href={s.resumeUrl}
          download={`${s.resumeFileName || s.name || 'CV'}.pdf`}
          className="link-btn link-btn-ghost header-resume"
        >
          CV ↓
        </a>
        <Link to="/#contact" className="btn btn-primary header-cta">Start a project</Link>
      </div>

      <div className="header-actions-mobile">
        <button type="button" className="header-search-btn header-search-btn-mobile" onClick={openCommandPalette} aria-label="Search">
          <Search size={17} />
        </button>
        <ThemeToggle />
        <button
          type="button"
          className={`header-menu-btn ${menuOpen ? 'is-open' : ''}`}
          onClick={() => setMenuOpen((v) => !v)}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
        >
          <Menu size={20} className="icon-menu" />
          <X size={20} className="icon-close" />
        </button>
      </div>

      <div className={`header-mobile-panel ${menuOpen ? 'is-open' : ''}`}>
        <nav className="header-mobile-nav">
          {NAV_LINKS.map((link) => (
            <Link key={link.to} to={link.to}>{link.label}</Link>
          ))}
        </nav>
        <div className="header-mobile-actions">
          <a
            href={s.resumeUrl}
            download={`${s.resumeFileName || s.name || 'CV'}.pdf`}
            className="link-btn link-btn-ghost"
          >
            Download CV ↓
          </a>
          <Link to="/#contact" className="btn btn-primary">Start a project</Link>
        </div>
      </div>
    </header>
  )
}
