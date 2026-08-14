import NetworkMap from './NetworkMap.jsx'
import ProfileCard from './ProfileCard.jsx'
import { useSiteSettings } from '../context/SiteSettingsContext.jsx'

export default function Hero() {
  const s = useSiteSettings()

  return (
    <section id="top" className="hero">
      <ProfileCard />

      <div className="hero-copy">
        <span className="hero-badge">
          <span className="status-dot" /> {s.location}-based · {s.tagline}
        </span>
        <p className="hero-greeting">
          Hi, I'm <strong className="name-strong">{s.heroGreetingName}</strong>. Welcome to my site.
        </p>
        <h1>
          {s.heroHeadlineLine1}<br />
          behind <span className="text-glow">{s.heroHeadlineHighlight}</span>
        </h1>
        <p className="hero-sub">{s.heroSub}</p>
        <div className="hero-actions">
          <a href="#work" className="btn btn-primary">Start a project →</a>
          <a href={s.githubUrl} target="_blank" rel="noreferrer" className="btn btn-ghost">GitHub ↗</a>
        </div>
      </div>

      <NetworkMap />
    </section>
  )
}
