import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CurtainLink } from '../context/CurtainContext.jsx'
import Reveal from '../components/Reveal.jsx'
import useContent from '../hooks/useContent.js'
import { getPosts } from '../lib/content.js'
import fallbackPosts from '../data/posts.js'
import { allTags, postTags } from '../lib/tags.js'
import SEO from '../components/SEO.jsx'
import BlurImage from '../components/BlurImage.jsx'
import { formatDate } from '../components/BlogTeaser.jsx'

export default function BlogList() {
  const [posts, loading] = useContent(getPosts, fallbackPosts)
  const [params, setParams] = useSearchParams()
  const [q, setQ] = useState('')
  const tag = params.get('tag') || 'All'
  const tags = useMemo(() => allTags(posts), [posts])

  const term = q.trim().toLowerCase()
  const shown = posts.filter((p) => {
    const okTag = tag === 'All' || postTags(p).includes(tag)
    const okText = !term || `${p.title} ${p.excerpt || ''}`.toLowerCase().includes(term)
    return okTag && okText
  })

  function pickTag(t) {
    const next = new URLSearchParams(params)
    if (t === 'All') next.delete('tag')
    else next.set('tag', t)
    setParams(next, { replace: true })
  }

  return (
    <main className="blog-page">
      <SEO title="Blog" path="/blog" description="Notes on building, shipping and running web products." />

      <section className="blog-hero">
        <p className="eyebrow">Writing</p>
        <h1>Notes from the build.</h1>
        <p className="section-sub">
          Things I've learned shipping client sites, APIs and the infrastructure underneath them.
        </p>
        <input
          className="field blog-search"
          type="search"
          placeholder="Search posts"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search posts"
        />
        {tags.length > 0 && (
          <div className="chip-row" role="tablist" aria-label="Filter by topic">
            <button type="button" role="tab" aria-selected={tag === 'All'} className={`chip ${tag === 'All' ? 'on' : ''}`} onClick={() => pickTag('All')}>
              All <span className="chip-count">{posts.length}</span>
            </button>
            {tags.map(([t, n]) => (
              <button key={t} type="button" role="tab" aria-selected={tag === t} className={`chip ${tag === t ? 'on' : ''}`} onClick={() => pickTag(t)}>
                {t} <span className="chip-count">{n}</span>
              </button>
            ))}
          </div>
        )}
      </section>

      {!loading && posts.length === 0 && <p className="section-sub">No posts yet, check back soon.</p>}
      {posts.length > 0 && shown.length === 0 && <p className="section-sub">No posts match. Try another word or topic.</p>}

      <div className="blog-list">
        {shown.map((post, i) => (
          <Reveal key={post._id || post.slug} delay={(i % 3) * 70}>
            <CurtainLink to={`/blog/${post.slug}`} label="Blog" className="blog-card" data-cursor="Read">
              {post.coverImage && (
                <div className="blog-card-image"><BlurImage src={post.coverImage} alt="" /></div>
              )}
              <div className="blog-card-body">
                <span className="mono-label">{formatDate(post.publishedAt)}</span>
                <h2>{post.title}</h2>
                <p>{post.excerpt}</p>
                <div className="tag-row">
                  {postTags(post).slice(0, 3).map((t) => <span className="tag" key={t}>{t}</span>)}
                </div>
                <span className="post-go">Read post →</span>
              </div>
            </CurtainLink>
          </Reveal>
        ))}
      </div>
    </main>
  )
}
