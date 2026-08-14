import { useParams, Link } from 'react-router-dom'
import { PortableText } from '@portabletext/react'
import useContent from '../hooks/useContent.js'
import { getPostBySlug } from '../lib/content.js'
import fallbackPosts from '../data/posts.js'
import SEO from '../components/SEO.jsx'

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export default function BlogPost() {
  const { slug } = useParams()
  const fallback = fallbackPosts.find((p) => p.slug === slug) || null
  const [post, loading] = useContent(() => getPostBySlug(slug), fallback, [slug])

  if (!loading && !post) {
    return (
      <main className="blog-page">
        <SEO title="Post not found" path={`/blog/${slug}`} />
        <p className="section-sub">
          Couldn't find that post. <Link to="/blog" className="link-btn">Back to blog ↗</Link>
        </p>
      </main>
    )
  }

  if (!post) return null

  return (
    <main className="blog-page">
      <SEO
        title={post.title}
        description={post.excerpt}
        image={post.coverImage}
        path={`/blog/${post.slug}`}
        type="article"
      />

      <article className="blog-post">
        <Link to="/blog" className="link-btn link-btn-ghost blog-back">← All posts</Link>
        <span className="blog-date">{formatDate(post.publishedAt)}</span>
        <h1>{post.title}</h1>

        {post.coverImage && (
          <div className="blog-post-image">
            <img src={post.coverImage} alt="" />
          </div>
        )}

        <div className="blog-post-body">
          <PortableText value={post.body} />
        </div>
      </article>
    </main>
  )
}
