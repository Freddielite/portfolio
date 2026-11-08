import ShareCard from './ShareCard.jsx'
import { postTags } from '../../lib/tags.js'
import { wordCount } from '../portableText.js'
import { flattenBlocks } from '../../lib/blocks.js'

function checks(post) {
  const words = wordCount(post.body)
  const title = (post.title || '').length
  const ex = (post.excerpt || '').length
  const h2 = flattenBlocks(post.body).filter((b) => b.style === 'h2').length
  return [
    [title >= 30 && title <= 65, `Title is ${title} characters. Aim for 30 to 65 so Google shows all of it.`],
    [ex >= 70 && ex <= 160, `Summary is ${ex} characters. Aim for 70 to 160, it becomes the Google and WhatsApp description.`],
    [words >= 300, `${words} words. Posts under 300 words rarely rank, so add detail if you can.`],
    [words < 500 || h2 >= 2, 'Long posts read better with at least two ## headings (they also build the contents list).'],
    [!!post.slug && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(post.slug), 'Slug is clean (lowercase words joined by dashes).'],
    [!post.coverImage || !!post.coverAlt, 'Cover image has alt text.'],
    [Array.isArray(post.tags) && post.tags.length > 0, 'Tags set by hand (otherwise they are picked from the title and summary).'],
  ]
}

export default function SeoPanel({ post, origin }) {
  const domain = origin.replace(/^https?:\/\//, '')
  const tags = postTags(post)
  const url = `${origin}/blog/${post.slug || 'your-slug'}`
  const items = checks(post)
  const good = items.filter(([ok]) => ok).length
  return (
    <div className="builder-seo">
      <div>
        <p className="admin-label">Checklist ({good} of {items.length})</p>
        <ul className="seo-checks">
          {items.map(([ok, text]) => (
            <li key={text} className={ok ? 'ok' : 'warn'}><span aria-hidden="true">{ok ? '✓' : '!'}</span> {text}</li>
          ))}
        </ul>
      </div>
      <div>
        <p className="admin-label">On Google</p>
        <div className="google-snippet">
          <span className="gs-url">{url}</span>
          <span className="gs-title">{post.title || 'Your post title'}</span>
          <span className="gs-desc">{(post.excerpt || 'Your summary appears here.').slice(0, 160)}</span>
        </div>
        <p className="admin-label">When shared</p>
        <ShareCard post={{ ...post, tags }} domain={domain} />
        <div className="wa-preview">
          <div className="wa-thumb"><ShareCard post={{ ...post, tags }} domain={domain} /></div>
          <div className="wa-text">
            <strong>{post.title || 'Your post title'}</strong>
            <span>{(post.excerpt || '').slice(0, 90)}</span>
            <em>{domain}</em>
          </div>
        </div>
        <p className="admin-hint">The real card is generated when the site rebuilds. This is a close look-alike.</p>
      </div>
    </div>
  )
}
