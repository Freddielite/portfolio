import { CurtainLink } from '../context/CurtainContext.jsx'
import { useSiteSettings } from '../context/SiteSettingsContext.jsx'

export default function Footer() {
  const s = useSiteSettings()
  return (
    <footer className="footer">
      <div className="footer-inner">
        <p>
          <strong className="name-strong">{s.name}</strong> · {s.company}
        </p>
        <nav className="footer-nav" aria-label="Footer">
          <CurtainLink to="/">Home</CurtainLink>
          <CurtainLink to="/#work">Work</CurtainLink>
          <CurtainLink to="/blog">Blog</CurtainLink>
          <CurtainLink to="/#contact">Contact</CurtainLink>
          <a href={s.githubUrl} target="_blank" rel="noreferrer">GitHub ↗</a>
        </nav>
      </div>
    </footer>
  )
}
