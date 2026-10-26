import Reveal from './Reveal.jsx'
import { CurtainLink } from '../context/CurtainContext.jsx'
import useContent from '../hooks/useContent.js'
import { getPosts } from '../lib/content.js'
import fallbackPosts from '../data/posts.js'

export function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

export default function BlogTeaser() {
  const [posts] = useContent(getPosts, fallbackPosts)
  if (!posts.length) return null

  return (
    <section id="journal" className="section">
      <Reveal as="p" className="eyebrow">Blog</Reveal>
      <Reveal as="h2" className="hb">Notes from the build.</Reveal>
      <div className="post-list">
        {posts.slice(0, 3).map((post, i) => (
          <Reveal key={post._id || post.slug} delay={i * 80}>
            <CurtainLink to={`/blog/${post.slug}`} label="Blog" className="post" data-cursor="Read">
              <div>
                <span className="mono-label">{formatDate(post.publishedAt)}</span>
                <h3>{post.title}</h3>
                {post.excerpt && <p>{post.excerpt}</p>}
              </div>
              <span className="post-go">Read →</span>
            </CurtainLink>
          </Reveal>
        ))}
      </div>
      <Reveal>
        <CurtainLink to="/blog" label="Blog" className="btn btn-ghost mag">All posts →</CurtainLink>
      </Reveal>
    </section>
  )
}
