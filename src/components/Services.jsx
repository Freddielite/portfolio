import { useState } from 'react'
import Reveal from './Reveal.jsx'
import { glowMove } from '../hooks/usePointerFx.js'

const SERVICES = [
  {
    n: '01',
    title: 'Web design and builds',
    text: 'Business sites, storefronts and dashboards that look sharp, load fast and turn visitors into enquiries.',
    tags: ['React', 'Next.js', 'Commerce'],
  },
  {
    n: '02',
    title: 'Backend and APIs',
    text: 'Authenticated APIs, payments and admin tools that hold up under real use.',
    tags: ['Django REST', 'Go', 'Node.js'],
  },
  {
    n: '03',
    title: 'Networking, security, uptime',
    text: 'Hardened servers, monitoring and deployment so what you build stays online.',
    tags: ['Linux', 'Security', 'Monitoring'],
  },
]

const ENGAGE = {
  project: {
    title: 'One-off project',
    text: 'Fixed scope, clear milestones and a finished build with a proper handover. Best when you know what you need.',
  },
  retainer: {
    title: 'Monthly retainer',
    text: 'Reserved monthly hours for updates, new features, monitoring and quick fixes. Your product keeps improving after launch.',
  },
}

const STEPS = [
  ['Discover', 'We talk goals, users and constraints. You get a clear scope.'],
  ['Design', 'Layout, look and flow agreed before any heavy build starts.'],
  ['Build', 'Frontend, backend and infrastructure built together, with regular progress updates.'],
  ['Launch', 'Deployed, tested and secured. Nothing half-finished goes live.'],
  ['Support', 'Monitoring, fixes and new features on a retainer if you want it.'],
]

export default function Services() {
  const [mode, setMode] = useState('project')
  const e = ENGAGE[mode]

  return (
    <>
      <section id="services" className="section">
        <Reveal as="p" className="eyebrow">Services</Reveal>
        <Reveal as="h2" className="hb">How I can help.</Reveal>

        <div className="service-grid">
          {SERVICES.map((s, i) => (
            <Reveal className="card glow" delay={i * 90} key={s.n} onPointerMove={glowMove}>
              <span className="mono-label">{s.n}</span>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
              <div className="tag-row">
                {s.tags.map((t) => <span className="tag" key={t}>{t}</span>)}
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal className="engage">
          <div className="seg" role="tablist" aria-label="Engagement type">
            <button type="button" role="tab" aria-selected={mode === 'project'}
              className={`chip ${mode === 'project' ? 'on' : ''}`} onClick={() => setMode('project')}>
              One-off project
            </button>
            <button type="button" role="tab" aria-selected={mode === 'retainer'}
              className={`chip ${mode === 'retainer' ? 'on' : ''}`} onClick={() => setMode('retainer')}>
              Monthly retainer
            </button>
          </div>
          <div className="card engage-card" key={mode}>
            <h3>{e.title}</h3>
            <p>{e.text}</p>
          </div>
        </Reveal>
      </section>

      <section id="process" className="section">
        <Reveal as="p" className="eyebrow">Process</Reveal>
        <Reveal as="h2" className="hb">From idea to live.</Reveal>
        <ol className="steps">
          {STEPS.map(([t, d], i) => (
            <Reveal as="li" className="step" delay={i * 70} key={t}>
              <i className="dot" aria-hidden="true" />
              <h3>{t}</h3>
              <p>{d}</p>
            </Reveal>
          ))}
        </ol>
      </section>
    </>
  )
}
