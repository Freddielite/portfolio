import { Link } from 'react-router-dom'
import useContent from '../hooks/useContent.js'
import { getPosts } from '../lib/content.js'
import fallbackPosts from '../data/posts.js'
import SEO from '../components/SEO.jsx'

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export default function BlogList() {
  const [posts, loading] = useContent(getPosts, fallbackPosts)

  return (
    <main className="blog-page">
      <SEO title="Blog" path="/blog" description="Notes on building, shipping and running web products." />

      <section className="blog-hero">
        <p className="eyebrow">Writing</p>
        <h1>Notes from the build.</h1>
        <p className="section-sub">
          Things I've learned shipping client sites, APIs and the infrastructure underneath them.
        </p>
      </section>

      {!loading && posts.length === 0 && (
        <p className="section-sub">No posts yet, check back soon.</p>
      )}

      <div className="blog-list">
        {posts.map((post) => (
          <Link to={`/blog/${post.slug}`} className="blog-list-card" key={post._id}>
            {post.coverImage && (
              <div className="blog-list-image">
                <img src={post.coverImage} alt="" />
              </div>
            )}
            <div className="blog-list-body">
              <span className="blog-date">{formatDate(post.publishedAt)}</span>
              <h2>{post.title}</h2>
              <p>{post.excerpt}</p>
              <span className="link-btn">Read post ↗</span>
            </div>
          </Link>
        ))}
      </div>
    </main>
  )
}
