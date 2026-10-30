import SEO from '../components/SEO.jsx'
import Reveal from '../components/Reveal.jsx'
import { CurtainLink } from '../context/CurtainContext.jsx'
import useContent from '../hooks/useContent.js'
import { getPosts } from '../lib/content.js'
import fallbackPosts from '../data/posts.js'
import { formatDate } from '../components/BlogTeaser.jsx'

export default function NotFound() {
  const [posts] = useContent(getPosts, fallbackPosts)
  const path = typeof window !== 'undefined' ? window.location.pathname : '/404'

  return (
    <main className="nf">
      <SEO title="Page not found" path={path} noIndex />

      <div className="nf-code" aria-hidden="true">
        <span>4</span>
        <span className="nf-zero"><i /></span>
        <span>4</span>
      </div>
      <h1>This page is not here.</h1>
      <p className="section-sub">The link may be old or mistyped. Here is where to go instead.</p>

      <div className="nf-actions">
        <CurtainLink to="/" className="btn btn-primary mag">Back home</CurtainLink>
        <CurtainLink to="/#work" className="btn btn-ghost mag">See my work</CurtainLink>
        <CurtainLink to="/blog" label="Blog" className="btn btn-ghost mag">Read the blog</CurtainLink>
      </div>
      <p className="mono-label nf-hint">Or press Ctrl K to search the whole site</p>

      {posts.length > 0 && (
        <div className="nf-posts">
          <p className="mono-label">Latest posts</p>
          {posts.slice(0, 3).map((post, i) => (
            <Reveal key={post._id || post.slug} delay={i * 80}>
              <CurtainLink to={`/blog/${post.slug}`} label="Blog" className="post">
                <div>
                  <span className="mono-label">{formatDate(post.publishedAt)}</span>
                  <h3>{post.title}</h3>
                </div>
                <span className="post-go">Read →</span>
              </CurtainLink>
            </Reveal>
          ))}
        </div>
      )}
    </main>
  )
}
