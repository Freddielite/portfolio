import { useEffect, useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import Reveal from './Reveal.jsx'
import CaseStudyModal from './CaseStudyModal.jsx'
import useContent from '../hooks/useContent.js'
import { getProjects } from '../lib/content.js'
import fallbackProjects from '../data/projects.js'
import { cardMove, cardLeave } from '../hooks/usePointerFx.js'
import { kindOf } from '../lib/projectKind.js'
import usePulseStatus from '../hooks/usePulseStatus.js'
import useReveal from '../hooks/useReveal.js'
import StatusChip from './StatusChip.jsx'

const canMorph = () =>
  typeof document !== 'undefined' &&
  !!document.startViewTransition &&
  !window.matchMedia('(prefers-reduced-motion: reduce)').matches



export default function Projects() {
  const [projects] = useContent(getProjects, fallbackProjects)
  const [filter, setFilter] = useState('All')
  const [activeId, setActiveId] = useState(null)
  const [morph, setMorph] = useState(false)
  const [sectionRef, seen] = useReveal(0.05)
  const statusFor = usePulseStatus(seen)

  useEffect(() => {
    function open(e) {
      setFilter('All')
      setActiveId(e.detail)
    }
    window.addEventListener('project:open', open)
    return () => window.removeEventListener('project:open', open)
  }, [])

  // Card to popup: the cover image grows out of the card (and shrinks back on
  // close) using the View Transitions API. Without support, it just opens.
  function openProject(p, card) {
    const thumb = card?.querySelector('.thumb')
    if (!thumb || !canMorph()) {
      setMorph(false)
      setActiveId(p.id)
      return
    }
    thumb.style.viewTransitionName = 'cover'
    document.startViewTransition(() => {
      flushSync(() => {
        setMorph(true)
        setActiveId(p.id)
      })
      thumb.style.viewTransitionName = ''
    })
  }

  function closeProject() {
    const thumb = morph && canMorph() ? document.querySelector(`[data-pid="${activeId}"] .thumb`) : null
    if (!thumb) {
      setActiveId(null)
      return
    }
    const t = document.startViewTransition(() => {
      flushSync(() => setActiveId(null))
      thumb.style.viewTransitionName = 'cover'
    })
    t.finished.finally(() => {
      thumb.style.viewTransitionName = ''
    })
  }

  const kinds = useMemo(() => ['All', ...new Set(projects.map(kindOf))], [projects])
  const shown = projects.filter((p) => filter === 'All' || kindOf(p) === filter)
  const activeIndex = shown.findIndex((p) => p.id === activeId)

  return (
    <section id="work" className="section" ref={sectionRef}>
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
              data-pid={p.id}
              onPointerMove={cardMove}
              onPointerLeave={cardLeave}
              onClick={(e) => {
                if (!e.target.closest('a, button')) openProject(p, e.currentTarget)
              }}
            >
              <div className="thumb">
                {p.image ? (
                  <img src={p.image} alt={`${p.name} preview`} loading="lazy" />
                ) : (
                  <span className="thumb-initial">{p.name.charAt(0)}</span>
                )}
                <StatusChip status={statusFor(p)} />
                <span className={`kind kind-${kindOf(p).toLowerCase().replace(/\s/g, '-')}`}>{kindOf(p)}</span>
              </div>
              <h3>{p.name}</h3>
              <p>{p.description}</p>
              <div className="tag-row">
                {(p.tags || []).map((t) => <span className="tag" key={t}>{t}</span>)}
              </div>
              <div className="project-links">
                <button type="button" className="link-btn" onClick={(e) => openProject(p, e.currentTarget.closest('.project-card'))}>
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
          morph={morph}
          status={statusFor(shown[activeIndex])}
          onNavigate={(p) => setActiveId(p.id)}
          onClose={closeProject}
        />
      )}
    </section>
  )
}
