import { GitCommit, ExternalLink } from 'lucide-react'
import useGithubCommits from '../hooks/useGithubCommits.js'
import { describeCommit, CATEGORY_LABELS } from '../lib/commitLabels.js'
import { relativeTime } from '../lib/relativeTime.js'
import { useSiteSettings } from '../context/SiteSettingsContext.jsx'
import SEO from '../components/SEO.jsx'

export default function Changelog() {
  const s = useSiteSettings()
  const owner = s.changelogOwner
  const repo = s.changelogRepo
  const { commits, loading, error } = useGithubCommits(owner, repo)

  return (
    <main className="changelog-page">
      <SEO
        title="Changelog"
        path="/changelog"
        description="A live timeline of what's changed on this site, straight from its own git history."
      />

      <section className="changelog-hero">
        <p className="eyebrow">Build log</p>
        <h1>This site's own history.</h1>
        <p className="section-sub">
          Every edit here — from the admin panel or from code — is a real commit. This page reads
          that history straight from GitHub, live.
        </p>
      </section>

      {(!owner || !repo) && (
        <p className="section-sub">Changelog isn't configured yet — set it up in the admin panel under Site Settings.</p>
      )}

      {owner && repo && loading && <p className="admin-hint changelog-status">Loading commit history…</p>}

      {owner && repo && error && (
        <p className="admin-hint changelog-status">Couldn't load the changelog right now ({error}).</p>
      )}

      {owner && repo && commits && commits.length === 0 && (
        <p className="section-sub">No commits found.</p>
      )}

      {owner && repo && commits && commits.length > 0 && (
        <ol className="changelog-list">
          {commits.map((c) => {
            const { category, label } = describeCommit(c.message)
            return (
              <li className="changelog-item" key={c.sha}>
                <span className={`changelog-icon changelog-icon-${category}`} aria-hidden="true">
                  <GitCommit size={16} />
                </span>
                <div className="changelog-body">
                  <div className="changelog-row">
                    <span className={`changelog-badge changelog-badge-${category}`}>
                      {CATEGORY_LABELS[category]}
                    </span>
                    <span className="changelog-time">{relativeTime(c.date)}</span>
                  </div>
                  <p className="changelog-label">{label}</p>
                </div>
                <a href={c.url} target="_blank" rel="noreferrer" className="changelog-link" aria-label="View commit on GitHub">
                  <ExternalLink size={14} />
                </a>
              </li>
            )
          })}
        </ol>
      )}

      {owner && repo && (
        <a
          href={`https://github.com/${owner}/${repo}/commits`}
          target="_blank"
          rel="noreferrer"
          className="link-btn changelog-full-history"
        >
          View full history on GitHub ↗
        </a>
      )}
    </main>
  )
}
