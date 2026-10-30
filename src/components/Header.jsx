import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Menu, X, Search } from 'lucide-react'
import ThemeToggle from './ThemeToggle.jsx'
import { CurtainLink } from '../context/CurtainContext.jsx'
import { useSiteSettings } from '../context/SiteSettingsContext.jsx'

const NAV_LINKS = [
  { id: 'home', to: '/', label: 'Home' },
  { id: 'about', to: '/#about', label: 'About' },
  { id: 'work', to: '/#work', label: 'Work' },
  { id: 'services', to: '/#services', label: 'Services' },
  { id: 'blog', to: '/blog', label: 'Blog' },
  { id: 'contact', to: '/#contact', label: 'Contact' },
]

// Which nav link a page section belongs to (sections not listed keep the
// previous highlight).
const SECTION_TO_NAV = {
  top: 'home',
  about: 'about',
  skills: 'about',
  work: 'work',
  services: 'services',
  process: 'services',
  contact: 'contact',
}

function useActiveLink() {
  const { pathname } = useLocation()
  const [active, setActive] = useState('home')

  useEffect(() => {
    if (pathname.startsWith('/blog')) {
      setActive('blog')
      return
    }
    if (pathname !== '/') {
      setActive('')
      return
    }
    setActive('home')
    const nodes = Object.keys(SECTION_TO_NAV)
      .map((id) => document.getElementById(id))
      .filter(Boolean)
    if (!nodes.length) return
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting && SECTION_TO_NAV[en.target.id]) {
            setActive(SECTION_TO_NAV[en.target.id])
          }
        })
      },
      { rootMargin: '-45% 0px -50% 0px' }
    )
    nodes.forEach((n) => io.observe(n))
    return () => io.disconnect()
  }, [pathname])

  return active
}

export default function Header() {
  const s = useSiteSettings()
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()
  const active = useActiveLink()

  useEffect(() => {
    setMenuOpen(false)
  }, [location])

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOpen])

  const openPalette = () => window.dispatchEvent(new Event('palette:open'))

  return (
    <>
    <header className="header">
      <div className="header-bar">
        <CurtainLink to="/" label="Home" className="header-mark">
          <img className="header-avatar" src={s.photo} alt="" />
          <span>{s.shortName}<b>.</b></span>
        </CurtainLink>

        <nav className="header-nav" aria-label="Main">
          {NAV_LINKS.map((l) => (
            <CurtainLink key={l.id} to={l.to} className={active === l.id ? 'on' : ''}>
              {l.label}
            </CurtainLink>
          ))}
        </nav>

        <div className="header-actions">
          <button type="button" className="icon-btn search-btn" onClick={openPalette} aria-label="Search (Ctrl K)">
            <Search size={17} />
            <kbd>Ctrl K</kbd>
          </button>
          <ThemeToggle />
          <a
            href={s.resumeUrl}
            download={`${s.resumeFileName || s.name || 'CV'}.pdf`}
            className="link-btn link-btn-ghost header-resume"
          >
            CV ↓
          </a>
          <CurtainLink to="/#contact" className="btn btn-primary header-cta">Start a project</CurtainLink>
        </div>

        <div className="header-actions-mobile">
          <button type="button" className="icon-btn" onClick={openPalette} aria-label="Search">
            <Search size={18} />
          </button>
          <ThemeToggle />
          <button
            type="button"
            className="icon-btn header-menu-btn"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

    </header>
      <div className={`header-mobile-panel ${menuOpen ? 'is-open' : ''}`}>
      <nav className="header-mobile-nav" aria-label="Mobile">
        {NAV_LINKS.map((l) => (
          <CurtainLink key={l.id} to={l.to} className={active === l.id ? 'on' : ''} onClick={() => setMenuOpen(false)}>
            {l.label}
          </CurtainLink>
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
        <CurtainLink to="/#contact" className="btn btn-primary" onClick={() => setMenuOpen(false)}>Start a project</CurtainLink>
      </div>
    </div>
    </>
  )
}
