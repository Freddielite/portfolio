import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import StatusChip from './StatusChip.jsx'
import BlurImage from './BlurImage.jsx'

export default function CaseStudyModal({ project, next, prev, onNavigate, onClose, morph, status }) {
  const overlay = useRef(null)
  const panel = useRef(null)
  const [dir, setDir] = useState(0)

  // Always-fresh handlers for the long-lived event listeners below.
  const stepRef = useRef(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  stepRef.current = (d) => {
    const target = d > 0 ? next : prev
    if (!target || target.id === project.id) return
    setDir(d)
    onNavigate(target)
  }

  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') closeRef.current()
      if (e.key === 'ArrowRight') stepRef.current(1)
      if (e.key === 'ArrowLeft') stepRef.current(-1)
    }
    document.addEventListener('keydown', handleKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [])

  // Touch gestures: swipe left or right for the next or previous project, and
  // drag the sheet down from the top to close it.
  useEffect(() => {
    const ov = overlay.current
    const pn = panel.current
    if (!ov || !pn) return
    let sx = 0
    let sy = 0
    let dx = 0
    let dy = 0
    let mode = null
    let atTop = false
    let active = false

    function start(e) {
      if (e.touches.length !== 1) return
      const t = e.touches[0]
      sx = t.clientX
      sy = t.clientY
      dx = 0
      dy = 0
      mode = null
      atTop = ov.scrollTop <= 0
      active = true
      pn.style.transition = 'none'
    }
    function move(e) {
      if (!active) return
      const t = e.touches[0]
      dx = t.clientX - sx
      dy = t.clientY - sy
      if (!mode) {
        if (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.4) mode = 'x'
        else if (dy > 12 && atTop && dy > Math.abs(dx)) mode = 'y'
        else if (Math.abs(dy) > 12) mode = 'none'
      }
      if (mode === 'y') {
        if (e.cancelable) e.preventDefault()
        const d = Math.max(0, dy)
        pn.style.transform = `translateY(${d}px)`
        ov.style.backgroundColor = `rgba(8, 12, 24, ${0.6 * (1 - Math.min(1, d / 420))})`
      }
    }
    function end() {
      if (!active) return
      active = false
      if (mode === 'y') {
        if (dy > 110) {
          pn.style.transition = 'transform 0.25s ease-in'
          pn.style.transform = 'translateY(110%)'
          ov.style.transition = 'background-color 0.25s'
          ov.style.backgroundColor = 'rgba(8, 12, 24, 0)'
          setTimeout(() => closeRef.current({ instant: true }), 240)
        } else {
          pn.style.transition = 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)'
          pn.style.transform = ''
          ov.style.backgroundColor = ''
        }
      } else if (mode === 'x' && Math.abs(dx) > 70) {
        stepRef.current(dx < 0 ? 1 : -1)
      }
    }

    ov.addEventListener('touchstart', start, { passive: true })
    ov.addEventListener('touchmove', move, { passive: false })
    ov.addEventListener('touchend', end)
    ov.addEventListener('touchcancel', end)
    return () => {
      ov.removeEventListener('touchstart', start)
      ov.removeEventListener('touchmove', move)
      ov.removeEventListener('touchend', end)
      ov.removeEventListener('touchcancel', end)
    }
  }, [])

  useEffect(() => {
    overlay.current?.scrollTo(0, 0)
  }, [project.id])

  if (!project) return null
  const cs = project.caseStudy
  const kind = project.kind || 'Own product'
  const privateSource = kind === 'Client work' && !project.github

  return createPortal(
    <div
      ref={overlay}
      className={`modal-overlay ${morph ? 'morph' : ''}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        ref={panel}
        className={`modal-panel ${morph ? 'morph' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={`${project.name} case study`}
      >
        <div className="sheet-handle" aria-hidden="true" />
        <button className="modal-close" onClick={() => onClose()} aria-label="Close case study">Close ✕</button>

        <div className="modal-media">
          {project.image ? (
            <BlurImage key={project.id} src={project.image} alt={`${project.name} preview`} />
          ) : (
            <div className="modal-media-placeholder">
              <span className="mono-label">{project.id}</span>
              <span className="modal-media-name">{project.name}</span>
            </div>
          )}
        </div>

        <div className={`modal-body ${dir ? `dir-${dir > 0 ? 'next' : 'prev'}` : ''}`} key={project.id}>
          <div className="modal-head">
            <span className="mono-label">Case study · {kind}</span>
            <h3>{project.name}</h3>
            <p className="modal-lede">{project.description}</p>
          </div>

          <div className="tag-row">
            {(project.tags || []).map((t) => <span className="tag" key={t}>{t}</span>)}
            <StatusChip status={status} detail />
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
            <>
              <div className="modal-nav">
                <button type="button" className="nx" onClick={() => stepRef.current(-1)}>
                  <span className="mono-label">← Previous</span>
                  <strong>{prev.name}</strong>
                </button>
                <button type="button" className="nx nx-right" onClick={() => stepRef.current(1)}>
                  <span className="mono-label">Next →</span>
                  <strong>{next.name}</strong>
                </button>
              </div>
              <p className="swipe-hint mono-label">Swipe left or right to switch, drag down to close</p>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
