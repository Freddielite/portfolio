import SEO from '../components/SEO.jsx'
import { CurtainLink } from '../context/CurtainContext.jsx'
import { TOOLS } from '../components/Marquee.jsx'
import { formatDate } from '../components/BlogTeaser.jsx'
import useContent from '../hooks/useContent.js'
import { getPosts, getProjects, getSkills } from '../lib/content.js'
import fallbackPosts from '../data/posts.js'
import fallbackProjects from '../data/projects.js'
import fallbackSkills from '../data/skills.js'
import { kindOf } from '../lib/projectKind.js'
import { useSiteSettings } from '../context/SiteSettingsContext.jsx'

const host = (u) => {
  try {
    return new URL(u).host.replace(/^www\./, '')
  } catch {
    return u
  }
}

// A web CV built from the same data as the rest of the site, so it never goes
// stale. On screen it is a clean page, printed it becomes a tidy A4 CV.
export default function Cv() {
  const s = useSiteSettings()
  const [projects] = useContent(getProjects, fallbackProjects)
  const [skills] = useContent(getSkills, fallbackSkills)
  const [posts] = useContent(getPosts, fallbackPosts)
  const site = host(s.siteUrl || window.location.origin)

  return (
    <main className="cv">
      <SEO
        title="CV"
        path="/cv"
        description={`${s.name}, ${s.tagline.toLowerCase()}. Skills, selected projects and writing.`}
      />

      <div className="cv-toolbar">
        <CurtainLink to="/" className="link-btn link-btn-ghost">← Back to site</CurtainLink>
        <div className="cv-toolbar-actions">
          <button type="button" className="btn btn-primary" onClick={() => window.print()}>Print or save as PDF</button>
          {s.resumeUrl && (
            <a className="btn btn-ghost" href={s.resumeUrl} download={`${s.resumeFileName || s.name || 'CV'}.pdf`}>Download my PDF CV</a>
          )}
        </div>
      </div>

      <article className="cv-sheet">
        <header className="cv-head">
          <div>
            <h1>{s.name}</h1>
            <p className="cv-role">{s.tagline} · {s.company}</p>
          </div>
          {s.photo && <img className="cv-photo" src={s.photo} alt="" />}
        </header>

        <ul className="cv-contact">
          {s.email && <li><a href={`mailto:${s.email}`}>{s.email}</a></li>}
          <li><a href={s.siteUrl || '/'}>{site}</a></li>
          {s.githubUrl && <li><a href={s.githubUrl}>{host(s.githubUrl)}{new URL(s.githubUrl).pathname}</a></li>}
          {s.linkedinUrl && <li><a href={s.linkedinUrl}>LinkedIn</a></li>}
          {s.location && <li>{s.location}</li>}
        </ul>

        <section className="cv-section">
          <h2>Profile</h2>
          {s.aboutParagraphs.slice(0, 2).map((p, i) => <p key={i}>{p}</p>)}
          <dl className="cv-facts">
            <div><dt>Focus</dt><dd>{s.focusAreas}</dd></div>
            <div><dt>Works with</dt><dd>{s.worksWith}</dd></div>
            <div><dt>Engagement</dt><dd>{s.engagement}</dd></div>
          </dl>
        </section>

        <section className="cv-section">
          <h2>Skills</h2>
          <ul className="cv-skills">
            {skills.map((k) => (
              <li key={k.name}>
                <span>{k.name}</span>
                <span className="cv-dots" aria-label={`${k.level} out of 100`}>
                  {[1, 2, 3, 4, 5].map((n) => <i key={n} className={n <= Math.round(k.level / 20) ? 'on' : ''} />)}
                </span>
              </li>
            ))}
          </ul>
          <p className="cv-tools"><strong>Tools:</strong> {TOOLS.join(', ')}</p>
        </section>

        <section className="cv-section">
          <h2>Selected projects</h2>
          {projects.map((p) => (
            <div className="cv-item" key={p.id}>
              <div className="cv-item-head">
                <h3>{p.name}</h3>
                <span className="cv-kind">{kindOf(p)}</span>
              </div>
              <p>{p.description}</p>
              <p className="cv-meta">
                {(p.tags || []).join(' · ')}
                {p.live && <> · <a href={p.live}>{host(p.live)}</a></>}
                {p.github && <> · <a href={p.github}>GitHub</a></>}
                {kindOf(p) === 'Client work' && !p.github && <> · Source private (client work)</>}
              </p>
            </div>
          ))}
        </section>

        {posts.length > 0 && (
          <section className="cv-section">
            <h2>Writing</h2>
            <ul className="cv-posts">
              {posts.slice(0, 6).map((post) => (
                <li key={post.slug}>
                  <a href={`/blog/${post.slug}`}>{post.title}</a>
                  <span>{formatDate(post.publishedAt)}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="cv-section">
          <h2>Availability</h2>
          <dl className="cv-facts">
            <div><dt>Response time</dt><dd>{s.responseTime}</dd></div>
            <div><dt>Time zone</dt><dd>{s.timezone}</dd></div>
            <div><dt>Best way to reach me</dt><dd>{s.bestWayToReach}</dd></div>
          </dl>
        </section>
      </article>
    </main>
  )
}
