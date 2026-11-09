import BlurImage from './BlurImage.jsx'
import StatusChip from './StatusChip.jsx'
import { cardMove, cardLeave } from '../hooks/usePointerFx.js'
import { kindOf } from '../lib/projectKind.js'

// One project card, exactly as visitors see it. The public Work section and the
// admin's live preview both render this, so they cannot drift apart.
// `onOpen(project, cardElement)` opens the case study; leave it out for a preview.
export default function ProjectCard({ project: p, status = null, onOpen = null }) {
  const name = p.name || ''
  const kind = kindOf(p)
  return (
    <article
      className="card project-card"
      data-cursor="View"
      data-pid={p.id}
      onPointerMove={cardMove}
      onPointerLeave={cardLeave}
      onClick={(e) => {
        if (onOpen && !e.target.closest('a, button')) onOpen(p, e.currentTarget)
      }}
    >
      <div className="thumb">
        {p.image ? (
          <BlurImage src={p.image} alt={p.imageAlt || `${name} preview`} placeholder={p.imageLqip} />
        ) : (
          <span className="thumb-initial">{name.charAt(0)}</span>
        )}
        <StatusChip status={status} />
        <span className={`kind kind-${kind.toLowerCase().replace(/\s/g, '-')}`}>{kind}</span>
      </div>
      <h3>{name}</h3>
      <p>{p.description}</p>
      <div className="tag-row">
        {(p.tags || []).map((t) => <span className="tag" key={t}>{t}</span>)}
      </div>
      <div className="project-links">
        <button type="button" className="link-btn" onClick={(e) => onOpen?.(p, e.currentTarget.closest('.project-card'))}>
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
  )
}
