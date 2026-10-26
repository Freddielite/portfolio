import { useEffect, useMemo, useState } from 'react'
import Reveal from './Reveal.jsx'
import CaseStudyModal from './CaseStudyModal.jsx'
import useContent from '../hooks/useContent.js'
import { getProjects } from '../lib/content.js'
import fallbackProjects from '../data/projects.js'
import { cardMove, cardLeave } from '../hooks/usePointerFx.js'

const kindOf = (p) => p.kind || 'Own product'

export default function Projects() {
  const [projects] = useContent(getProjects, fallbackProjects)
  const [filter, setFilter] = useState('All')
  const [activeId, setActiveId] = useState(null)

  useEffect(() => {
    function open(e) {
      setFilter('All')
      setActiveId(e.detail)
    }
    window.addEventListener('project:open', open)
    return () => window.removeEventListener('project:open', open)
  }, [])

  const kinds = useMemo(() => ['All', ...new Set(projects.map(kindOf))], [projects])
  const shown = projects.filter((p) => filter === 'All' || kindOf(p) === filter)
  const activeIndex = shown.findIndex((p) => p.id === activeId)

  return (
    <section id="work" className="section">
      <Reveal as="p" className="eyebrow">Selected work</Reveal>
      <Reveal as="h2" className="hb">Case studies &amp; repos.</Reveal>

      <div className="chip-row" role="tablist" aria-label="Filter projects">
        {kinds.map((k) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={filter === k}
            className={`chip ${filter === k ? 'on' : ''}`}
            onClick={() => setFilter(k)}
          >
            {k === 'Own product' ? 'Own products' : k}
          </button>
        ))}
      </div>

      <div className="project-grid">
        {shown.map((p, i) => (
          <Reveal className="tl" delay={(i % 3) * 80} key={p.id}>
            <article
              className="card project-card"
              data-cursor="View"
              onPointerMove={cardMove}
              onPointerLeave={cardLeave}
              onClick={(e) => {
                if (!e.target.closest('a')) setActiveId(p.id)
              }}
            >
              <div className="thumb">
                {p.image ? (
                  <img src={p.image} alt={`${p.name} preview`} loading="lazy" />
                ) : (
                  <span className="thumb-initial">{p.name.charAt(0)}</span>
                )}
                <span className={`kind kind-${kindOf(p).toLowerCase().replace(/\s/g, '-')}`}>{kindOf(p)}</span>
              </div>
              <h3>{p.name}</h3>
              <p>{p.description}</p>
              <div className="tag-row">
                {(p.tags || []).map((t) => <span className="tag" key={t}>{t}</span>)}
              </div>
              <div className="project-links">
                <button type="button" className="link-btn" onClick={() => setActiveId(p.id)}>
                  Case study →
                </button>
                {p.live && (
                  <a href={p.live} target="_blank" rel="noreferrer" className="link-btn link-btn-ghost">Live ↗</a>
                )}
                {p.github && (
                  <a href={p.github} target="_blank" rel="noreferrer" className="link-btn link-btn-ghost">GitHub ↗</a>
                )}
              </div>
            </article>
          </Reveal>
        ))}
      </div>

      {activeIndex > -1 && (
        <CaseStudyModal
          project={shown[activeIndex]}
          next={shown[(activeIndex + 1) % shown.length]}
          prev={shown[(activeIndex - 1 + shown.length) % shown.length]}
          onNavigate={(p) => setActiveId(p.id)}
          onClose={() => setActiveId(null)}
        />
      )}
    </section>
  )
}
