import { postTags } from '../../lib/tags.js'

// A look-alike of the 1200x630 card the build generates for each post, so you can
// see roughly how a link will look before publishing.
export default function ShareCard({ post, domain, name = 'Oseghale Wilfred' }) {
  const tags = postTags(post).slice(0, 2)
  const date = post.publishedAt
    ? new Date(post.publishedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    : ''
  const t = post.title || 'Your post title appears here'
  const size = t.length <= 38 ? 6.3 : t.length <= 62 ? 5.3 : 4.5
  return (
    <div className="sharecard">
      <div className="sharecard-in">
        <div className="sharecard-top">
          {tags.map((x) => <span key={x}>{x}</span>)}
          <em>{date}</em>
        </div>
        <div className="sharecard-title" style={{ fontSize: `${size}cqw` }}>{t}</div>
        <div className="sharecard-foot">
          <i />
          <div><strong>{name}</strong><span>{domain}</span></div>
        </div>
      </div>
    </div>
  )
}
