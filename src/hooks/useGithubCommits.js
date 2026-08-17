import { useEffect, useState } from 'react'

// Module-level cache (not React state) so it survives across component
// unmounts — visiting /changelog twice in one session only fetches once.
// GitHub's unauthenticated REST API is rate-limited to 60 req/hour per IP,
// which is fine for a per-visitor call but not worth spending more than
// once per session on.
const cache = new Map() // "owner/repo" -> { commits, fetchedAt }
const CACHE_MS = 5 * 60 * 1000

export default function useGithubCommits(owner, repo, { perPage = 30 } = {}) {
  const [commits, setCommits] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!owner || !repo) {
      setLoading(false)
      return
    }

    const key = `${owner}/${repo}`
    const cached = cache.get(key)
    if (cached && Date.now() - cached.fetchedAt < CACHE_MS) {
      setCommits(cached.commits)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    fetch(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=${perPage}`, {
      headers: { Accept: 'application/vnd.github+json' },
    })
      .then((res) => {
        if (!res.ok) throw new Error(res.status === 404 ? 'Repo not found or private.' : 'Could not load commit history.')
        return res.json()
      })
      .then((data) => {
        if (cancelled) return
        const commits = data.map((c) => ({
          sha: c.sha,
          message: c.commit.message,
          date: c.commit.author?.date || c.commit.committer?.date,
          url: c.html_url,
        }))
        cache.set(key, { commits, fetchedAt: Date.now() })
        setCommits(commits)
        setLoading(false)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err.message)
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [owner, repo, perPage])

  return { commits, loading, error }
}
