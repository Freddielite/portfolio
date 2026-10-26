import Reveal from './Reveal.jsx'
import useReveal from '../hooks/useReveal.js'
import useContent from '../hooks/useContent.js'
import { getSkills } from '../lib/content.js'
import fallbackSkills from '../data/skills.js'
import { useSiteSettings } from '../context/SiteSettingsContext.jsx'

export default function Skills() {
  const [ref, on] = useReveal(0.2)
  const [skills] = useContent(getSkills, fallbackSkills)
  const s = useSiteSettings()

  return (
    <section id="skills" className="section">
      <div className="split">
        <div ref={ref}>
          <Reveal as="p" className="eyebrow">Skills</Reveal>
          <Reveal as="h2" className="hb">What I bring to a project.</Reveal>
          <p className="section-sub">Rough self-rating across the areas I work in most.</p>
          <div className="skill-list">
            {skills.map((skill, i) => (
              <div className="skill-row" key={skill.name}>
                <div className="skill-label">
                  <span>{skill.name}</span>
                  <span className="skill-level">{skill.level}%</span>
                </div>
                <div className="skill-track">
                  <div
                    className="skill-fill"
                    style={{ width: on ? `${skill.level}%` : '0%', transitionDelay: `${i * 80}ms` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <Reveal className="side-card" delay={120}>
          <div className="side-card-head">
            <span className="mono-label">{s.shortName.toUpperCase()} / AVAILABILITY</span>
            <span className="side-open"><span className="status-dot" /> {s.isAvailable ? 'OPEN' : 'BUSY'}</span>
          </div>
          <div className="side-block">
            <p className="mono-label">Response time</p>
            <p className="side-title">{s.responseTime}</p>
          </div>
          <div className="side-block">
            <p className="mono-label">Time zone</p>
            <p className="side-title">{s.timezone}</p>
          </div>
          <div className="side-block">
            <p className="mono-label">Best way to reach me</p>
            <p className="side-title">{s.bestWayToReach}</p>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
