import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

export default function CaseStudyModal({ project, next, prev, onNavigate, onClose }) {
  const panel = useRef(null)

  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight' && next) onNavigate(next)
      if (e.key === 'ArrowLeft' && prev) onNavigate(prev)
    }
    document.addEventListener('keydown', handleKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [onClose, onNavigate, next, prev])

  useEffect(() => {
    panel.current?.scrollTo(0, 0)
  }, [project.id])

  if (!project) return null
  const cs = project.caseStudy
  const kind = project.kind || 'Own product'
  const privateSource = kind === 'Client work' && !project.github

  return createPortal(
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div
        ref={panel}
        className="modal-panel"
        role="dialog"
        aria-modal="true"
        aria-label={`${project.name} case study`}
      >
        <button className="modal-close" onClick={onClose} aria-label="Close case study">Close ✕</button>

        <div className="modal-media">
          {project.image ? (
            <img src={project.image} alt={`${project.name} preview`} />
          ) : (
            <div className="modal-media-placeholder">
              <span className="mono-label">{project.id}</span>
              <span className="modal-media-name">{project.name}</span>
            </div>
          )}
        </div>

        <div className="modal-body" key={project.id}>
          <div className="modal-head">
            <span className="mono-label">Case study · {kind}</span>
            <h3>{project.name}</h3>
            <p className="modal-lede">{project.description}</p>
          </div>

          <div className="tag-row">
            {(project.tags || []).map((t) => <span className="tag" key={t}>{t}</span>)}
          </div>

          {cs && (
            <div className="modal-case">
              {[['The problem', cs.problem], ['The approach', cs.approach], ['The outcome', cs.outcome]].map(
                ([label, text], i) =>
                  text && (
                    <div className="modal-block" style={{ '--i': i }} key={label}>
                      <p className="mono-label">{label}</p>
                      <p>{text}</p>
                    </div>
                  )
              )}
            </div>
          )}

          <div className="project-links">
            {project.live && (
              <a href={project.live} target="_blank" rel="noreferrer" className="btn btn-primary">Live site ↗</a>
            )}
            {project.github && (
              <a href={project.github} target="_blank" rel="noreferrer" className="btn btn-ghost">GitHub ↗</a>
            )}
            {privateSource && <span className="modal-note">Built for a client, source is private.</span>}
          </div>

          {next && next.id !== project.id && (
            <div className="modal-nav">
              <button type="button" className="nx" onClick={() => onNavigate(prev)}>
                <span className="mono-label">← Previous</span>
                <strong>{prev.name}</strong>
              </button>
              <button type="button" className="nx nx-right" onClick={() => onNavigate(next)}>
                <span className="mono-label">Next →</span>
                <strong>{next.name}</strong>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
