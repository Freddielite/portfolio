import { useState } from 'react'
import { CurtainLink } from '../context/CurtainContext.jsx'
import Reveal from '../components/Reveal.jsx'
import useContent from '../hooks/useContent.js'
import { getPosts } from '../lib/content.js'
import fallbackPosts from '../data/posts.js'
import SEO from '../components/SEO.jsx'
import { formatDate } from '../components/BlogTeaser.jsx'

export default function BlogList() {
  const [posts, loading] = useContent(getPosts, fallbackPosts)
  const [q, setQ] = useState('')
  const term = q.trim().toLowerCase()
  const shown = posts.filter((p) => !term || `${p.title} ${p.excerpt || ''}`.toLowerCase().includes(term))

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
      </section>

      {!loading && posts.length === 0 && <p className="section-sub">No posts yet, check back soon.</p>}
      {posts.length > 0 && shown.length === 0 && <p className="section-sub">No posts match. Try another word.</p>}

      <div className="blog-list">
        {shown.map((post, i) => (
          <Reveal key={post._id || post.slug} delay={(i % 3) * 70}>
            <CurtainLink to={`/blog/${post.slug}`} label="Blog" className="blog-card" data-cursor="Read">
              {post.coverImage && (
                <div className="blog-card-image"><img src={post.coverImage} alt="" loading="lazy" /></div>
              )}
              <div className="blog-card-body">
                <span className="mono-label">{formatDate(post.publishedAt)}</span>
                <h2>{post.title}</h2>
                <p>{post.excerpt}</p>
                <span className="post-go">Read post →</span>
              </div>
            </CurtainLink>
          </Reveal>
        ))}
      </div>
    </main>
  )
}
