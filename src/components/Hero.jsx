import NetworkMap from './NetworkMap.jsx'
import ProfileCard from './ProfileCard.jsx'

export default function Hero() {
  return (
    <section id="top" className="hero">
      <ProfileCard />

      <div className="hero-copy">
        <span className="hero-badge">
          <span className="status-dot" /> Nigeria-based · Full-stack developer
        </span>
        <p className="hero-greeting">
          Hi, I'm <strong className="name-strong">Oseghale Wilfred</strong>. Welcome to my site.
        </p>
        <h1>
          I build the systems<br />
          behind <span className="text-glow">the interface.</span>
        </h1>
        <p className="hero-sub">
          From responsive storefronts to authenticated APIs and the infrastructure
          that keeps them online, I design and ship complete web products
          for small businesses and growing teams.
        </p>
        <div className="hero-actions">
          <a href="#work" className="btn btn-primary">Start a project →</a>
          <a href="https://github.com/Freddielite" target="_blank" rel="noreferrer" className="btn btn-ghost">GitHub ↗</a>
        </div>
      </div>

      <NetworkMap />
    </section>
  )
}
