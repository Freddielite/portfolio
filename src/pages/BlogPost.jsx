import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { PortableText } from '@portabletext/react'
import { CurtainLink } from '../context/CurtainContext.jsx'
import useContent from '../hooks/useContent.js'
import { getPostBySlug, getPosts } from '../lib/content.js'
import fallbackPosts from '../data/posts.js'
import { postTags, relatedPosts } from '../lib/tags.js'
import SEO from '../components/SEO.jsx'
import NotFound from './NotFound.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { formatDate } from '../components/BlogTeaser.jsx'

const slugify = (t) => t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const blockText = (b) => (b.children || []).map((c) => c.text || '').join('')

function readMinutes(body = []) {
  const words = body.reduce((n, b) => n + (b._type === 'block' ? blockText(b).split(/\s+/).filter(Boolean).length : 0), 0)
  return Math.max(1, Math.ceil(words / 200))
}

const components = {
  block: {
    h2: ({ children, value }) => <h2 id={slugify(blockText(value))}>{children}</h2>,
    h3: ({ children, value }) => <h3 id={slugify(blockText(value))}>{children}</h3>,
  },
}

export default function BlogPost() {
  const { slug } = useParams()
  const fallback = fallbackPosts.find((p) => p.slug === slug) || null
  const [post, loading] = useContent(() => getPostBySlug(slug), fallback, [slug])
  const [copied, setCopied] = useState(false)
  const { toast } = useToast()

  const toc = useMemo(
    () => (post?.body || []).filter((b) => b._type === 'block' && /^h[23]$/.test(b.style)).map((b) => ({ text: blockText(b), id: slugify(blockText(b)) })),
    [post]
  )
  const related = useMemo(() => (post ? relatedPosts(post, getPosts(), 3) : []), [post])

  if (!loading && !post) return <NotFound />
  if (!post) return null

  async function copy() {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      toast('Link copied')
      setTimeout(() => setCopied(false), 2000)
    } catch { /* clipboard blocked */ }
  }

  const tags = postTags(post)

  return (
    <main className="blog-page">
      <SEO
        title={post.title}
        description={post.excerpt}
        image={`/og/${post.slug}.png`}
        path={`/blog/${post.slug}`}
        type="article"
      />

      <article className="blog-post">
        <CurtainLink to="/blog" label="Blog" className="link-btn link-btn-ghost blog-back">← All posts</CurtainLink>
        <span className="mono-label">{formatDate(post.publishedAt)} · {readMinutes(post.body)} min read</span>
        <h1>{post.title}</h1>

        <div className="blog-tools">
          {tags.map((t) => (
            <CurtainLink key={t} to={`/blog?tag=${encodeURIComponent(t)}`} label="Blog" className="chip">{t}</CurtainLink>
          ))}
          <button type="button" className="chip" onClick={copy}>{copied ? 'Copied' : 'Copy link'}</button>
        </div>

        {post.coverImage && (
          <div className="blog-post-image"><img src={post.coverImage} alt="" /></div>
        )}

        {toc.length > 1 && (
          <nav className="card toc" aria-label="In this post">
            <span className="mono-label">In this post</span>
            {toc.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => document.getElementById(t.id)?.scrollIntoView({ behavior: 'smooth' })}
              >
                {t.text}
              </button>
            ))}
          </nav>
        )}

        <div className="blog-post-body">
          <PortableText value={post.body} components={components} />
        </div>

        {related.length > 0 && (
          <section className="related" aria-label="Keep reading">
            <p className="mono-label">Keep reading</p>
            <div className="related-grid">
              {related.map((r) => (
                <CurtainLink key={r.slug} to={`/blog/${r.slug}`} label="Blog" className="rel-card" data-cursor="Read">
                  <span className="mono-label">{formatDate(r.publishedAt)}</span>
                  <strong>{r.title}</strong>
                  <span className="tag-row">
                    {postTags(r).slice(0, 2).map((t) => <span className="tag" key={t}>{t}</span>)}
                  </span>
                </CurtainLink>
              ))}
            </div>
          </section>
        )}
      </article>
    </main>
  )
}
