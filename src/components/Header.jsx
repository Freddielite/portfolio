export default function Header() {
  return (
    <header className="header">
      <a href="#top" className="header-mark">
        <span className="header-mark-dot" aria-hidden="true" />
        WF
      </a>
      <nav className="header-nav">
        <a href="#about">About</a>
        <a href="#skills">Skills</a>
        <a href="#work">Work</a>
        <a href="#contact">Contact</a>
      </nav>
      <div className="header-actions">
        <a href="/cv.pdf" download className="link-btn link-btn-ghost header-resume">
          CV ↓
        </a>
        <a href="#contact" className="btn btn-primary header-cta">Start a project</a>
      </div>
    </header>
  )
}
