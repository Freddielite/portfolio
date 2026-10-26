import Reveal from './Reveal.jsx'
import Terminal from './Terminal.jsx'
import { glowMove } from '../hooks/usePointerFx.js'
import { useSiteSettings } from '../context/SiteSettingsContext.jsx'

export default function About() {
  const s = useSiteSettings()
  const facts = [
    ['Focus', s.focusAreas],
    ['Works with', s.worksWith],
    ['Engagement', s.engagement],
  ]

  return (
    <section id="about" className="section about">
      <Reveal as="p" className="eyebrow">About</Reveal>
      <Reveal as="h2" className="hb">I take ideas to working products.</Reveal>

      <div className="about-grid">
        <div className="about-copy">
          {s.aboutParagraphs.map((p, i) => (
            <Reveal as="p" delay={i * 90} className="about-p" key={i}>{p}</Reveal>
          ))}
          <div className="fact-grid">
            {facts.map(([label, value], i) => (
              <Reveal className="card glow" delay={i * 90} key={label} onPointerMove={glowMove}>
                <span className="mono-label">{label}</span>
                <h3>{value}</h3>
              </Reveal>
            ))}
          </div>
        </div>
        <Reveal className="about-term" delay={120}>
          <Terminal />
        </Reveal>
      </div>
    </section>
  )
}
