import { useState } from 'react'
import useInView from '../hooks/useInView.js'
import useContent from '../hooks/useContent.js'
import { getProjects } from '../lib/content.js'
import fallbackProjects from '../data/projects.js'
import CaseStudyModal from './CaseStudyModal.jsx'

export default function Projects() {
  const [ref, inView] = useInView({ threshold: 0.1 })
  const [activeProject, setActiveProject] = useState(null)
  const [projects] = useContent(getProjects, fallbackProjects)

  return (
    <section id="work" className={`projects reveal ${inView ? 'in-view' : ''}`} ref={ref}>
      <p className="eyebrow">Selected work</p>
      <h2>Case studies &amp; repos.</h2>

      <div className="project-grid">
        {projects.map((p, i) => (
          <article
            className={`project-card reveal ${inView ? 'in-view' : ''}`}
            style={{ transitionDelay: inView ? `${i * 100}ms` : '0ms' }}
            key={p.id}
          >
            <span className="project-watermark" aria-hidden="true">{p.id}</span>
            <div className="project-index">NODE {p.id}</div>
            <h3>{p.name}</h3>
            <p>{p.description}</p>
            <div className="project-tags">
              {p.tags.map((tag) => (
                <span className="tag" key={tag}>{tag}</span>
              ))}
            </div>
            <div className="project-links">
              <button type="button" className="link-btn" onClick={() => setActiveProject(p)}>
                Case study ↗
              </button>
              {p.live && (
                <a href={p.live} target="_blank" rel="noreferrer" className="link-btn link-btn-ghost">
                  Live site ↗
                </a>
              )}
              {p.github && (
                <a href={p.github} target="_blank" rel="noreferrer" className="link-btn link-btn-ghost">
                  GitHub ↗
                </a>
              )}
            </div>
          </article>
        ))}
      </div>

      {activeProject && (
        <CaseStudyModal project={activeProject} onClose={() => setActiveProject(null)} />
      )}
    </section>
  )
}
