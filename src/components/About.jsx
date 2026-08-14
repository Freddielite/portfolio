import useInView from '../hooks/useInView.js'
import { useSiteSettings } from '../context/SiteSettingsContext.jsx'

export default function About() {
  const [ref, inView] = useInView({ threshold: 0.2 })
  const s = useSiteSettings()

  return (
    <section id="about" className={`about reveal ${inView ? 'in-view' : ''}`} ref={ref}>
      <div className="split-grid">
        <div className="split-main">
          <p className="eyebrow">About me</p>
          <h2>Who I am.</h2>
          <div className="about-body">
            {s.aboutParagraphs.map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>
        </div>

        <div className="network-card split-side">
          <div className="network-card-header">
            <span className="network-card-title">{s.shortName.toUpperCase()} / QUICK FACTS</span>
            <span className="network-card-status">
              <span className="status-dot" /> {s.availability}
            </span>
          </div>
          <ul className="fact-list">
            <li>
              <span className="fact-label">Based in</span>
              <span>{s.location}</span>
            </li>
            <li>
              <span className="fact-label">Focus areas</span>
              <span>{s.focusAreas}</span>
            </li>
            <li>
              <span className="fact-label">Runs</span>
              <span>{s.company}</span>
            </li>
            <li>
              <span className="fact-label">Works with</span>
              <span>{s.worksWith}</span>
            </li>
            <li>
              <span className="fact-label">Engagement</span>
              <span>{s.engagement}</span>
            </li>
          </ul>
        </div>
      </div>
    </section>
  )
}
