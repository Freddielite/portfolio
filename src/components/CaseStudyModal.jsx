import { useEffect } from 'react'
import { createPortal } from 'react-dom'

export default function CaseStudyModal({ project, onClose }) {
  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  if (!project) return null

  return createPortal(
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="modal-panel" role="dialog" aria-modal="true" aria-label={`${project.name} case study`}>
        <button className="modal-close" onClick={onClose} aria-label="Close case study">
          ×
        </button>

        <div className="modal-media">
          {project.image ? (
            <img src={project.image} alt={`${project.name} screenshot`} />
          ) : (
            <div className="modal-media-placeholder">
              <span className="modal-media-node">NODE {project.id}</span>
              <span className="modal-media-name">{project.name}</span>
              <span className="modal-media-note">Screenshot coming soon</span>
            </div>
          )}
        </div>

        <div className="modal-body">
          <div className="modal-header-row">
            <span className="project-index">NODE {project.id}</span>
            <h3>{project.name}</h3>
          </div>

          <div className="project-tags">
            {(project.tags || []).map((tag) => (
              <span className="tag" key={tag}>{tag}</span>
            ))}
          </div>

          {project.caseStudy && (
            <div className="modal-case-study">
              <div className="modal-case-block">
                <p className="modal-case-label">Problem</p>
                <p>{project.caseStudy.problem}</p>
              </div>
              <div className="modal-case-block">
                <p className="modal-case-label">Approach</p>
                <p>{project.caseStudy.approach}</p>
              </div>
              <div className="modal-case-block">
                <p className="modal-case-label">Outcome</p>
                <p>{project.caseStudy.outcome}</p>
              </div>
            </div>
          )}

          <div className="project-links">
            {project.live && (
              <a href={project.live} target="_blank" rel="noreferrer" className="link-btn">
                Live site ↗
              </a>
            )}
            {project.github && (
              <a href={project.github} target="_blank" rel="noreferrer" className="link-btn link-btn-ghost">
                GitHub ↗
              </a>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
