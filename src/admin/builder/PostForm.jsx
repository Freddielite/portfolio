import { useMemo, useRef, useState } from 'react'
import { PortableText } from '@portabletext/react'
import ImageUploader from '../ImageUploader.jsx'
import Toolbar, { editorHandlers } from './Toolbar.jsx'
import SeoPanel from './SeoPanel.jsx'
import { uploadImage } from '../imageUpload.js'
import * as act from './actions.js'
import { blocksToText, textToBlocks, wordCount } from '../portableText.js'
import { portableComponents } from '../../lib/portableComponents.jsx'
import { postState, todayString } from '../../lib/postStatus.js'

const slugify = (t) => t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

const VIEWS = [
  ['write', 'Write'],
  ['split', 'Write + preview'],
  ['preview', 'Preview'],
  ['seo', 'SEO and sharing'],
]

export default function PostForm({ post, onChange, onDelete, origin, savedLive }) {
  const [bodyText, setBodyText] = useState(() => blocksToText(post.body))
  const [tagText, setTagText] = useState(() => (post.tags || []).join(', '))
  const [autoSlug, setAutoSlug] = useState(!post.slug)
  const [view, setView] = useState(() => (typeof window !== 'undefined' && window.innerWidth >= 1100 ? 'split' : 'write'))
  const [pasteError, setPasteError] = useState(null)
  const area = useRef(null)

  const blocks = useMemo(() => textToBlocks(bodyText), [bodyText])
  const words = wordCount(blocks)
  const state = postState(post)

  const set = (key, value) => onChange({ ...post, [key]: value })

  function setTitle(title) {
    onChange({ ...post, title, slug: autoSlug ? slugify(title) : post.slug })
  }
  function setTags(text) {
    setTagText(text)
    set('tags', text.split(',').map((t) => t.trim()).filter(Boolean))
  }
  function setBody(text) {
    setBodyText(text)
    onChange({ ...post, body: textToBlocks(text) })
  }

  function run(fn) {
    const ta = area.current
    if (!ta) return
    const r = fn(ta.value, ta.selectionStart, ta.selectionEnd)
    setBody(r.value)
    requestAnimationFrame(() => {
      ta.focus()
      ta.setSelectionRange(r.start, r.end)
    })
  }

  async function addImageFile(file) {
    setPasteError(null)
    try {
      const { path } = await uploadImage(file, 'blog')
      run((v, s, e) => act.insertAt(v, s, e, `![Describe this image](${path})`))
    } catch (err) {
      setPasteError(err.message)
    }
  }

  const handlers = editorHandlers({ run, addImageFile })
  const today = todayString()
  const day = String(post.publishedAt || '').slice(0, 10)

  return (
    <div className="builder-form">
      <input className="builder-title" value={post.title} placeholder="Post title" onChange={(e) => setTitle(e.target.value)} aria-label="Post title" />

      <div className="builder-meta-row">
        <div className="admin-seg" role="group" aria-label="Status">
          <button type="button" className={post.status === 'draft' ? 'on' : ''} onClick={() => set('status', 'draft')}>Draft</button>
          <button type="button" className={post.status !== 'draft' ? 'on' : ''} onClick={() => set('status', 'published')}>Published</button>
        </div>
        <label className="admin-inline">
          Date
          <input type="date" value={day} onChange={(e) => set('publishedAt', e.target.value)} />
        </label>
        <span className={`admin-badge is-${state}`}>
          {state === 'draft' && 'Draft, hidden from the site'}
          {state === 'published' && 'Live'}
          {state === 'scheduled' && `Goes live ${day}`}
        </span>
        <div className="admin-spacer" />
        {savedLive && state === 'published' && post.slug && (
          <a className="admin-link" href={`/blog/${post.slug}`} target="_blank" rel="noreferrer">View on site ↗</a>
        )}
        <button type="button" className="admin-btn-danger" onClick={onDelete}>Delete post</button>
      </div>
      {state === 'scheduled' && (
        <p className="admin-hint">
          Scheduled posts show up on their own date, with no extra step. The post is already in the site files, so use Draft if the text must stay private until then. Search engines pick up the page at the first rebuild after the date.
        </p>
      )}
      {post.status !== 'draft' && day && day < today && false}

      <details className="builder-details">
        <summary>Post details: web address, summary, tags, cover image</summary>
        <div className="admin-grid-2">
          <div className="admin-field">
            <label className="admin-label">Slug (web address)</label>
            <input
              value={post.slug}
              onChange={(e) => {
                setAutoSlug(false)
                set('slug', slugify(e.target.value))
              }}
              placeholder="my-post-title"
            />
            <p className="admin-hint">{origin}/blog/{post.slug || 'your-slug'}</p>
          </div>
          <div className="admin-field">
            <label className="admin-label">Tags (comma separated)</label>
            <input value={tagText} placeholder="Email, Backend" onChange={(e) => setTags(e.target.value)} />
            <p className="admin-hint">Leave empty and tags are chosen automatically from the title and summary.</p>
          </div>
        </div>
        <div className="admin-field">
          <label className="admin-label">Summary ({(post.excerpt || '').length} characters)</label>
          <textarea rows={3} value={post.excerpt || ''} onChange={(e) => set('excerpt', e.target.value)} />
          <p className="admin-hint">Shown on the blog page, in Google results and in link previews. 70 to 160 characters works best.</p>
        </div>
        <ImageUploader
          label="Cover image (optional)"
          value={post.coverImage}
          onChange={(v, meta) => onChange({ ...post, coverImage: v, coverLqip: v ? meta?.lqip || null : null, coverAlt: v ? post.coverAlt : null })}
          alt={post.coverAlt}
          onAltChange={(v) => set('coverAlt', v)}
          folder="blog"
        />
      </details>

      <div className="admin-viewtabs" role="tablist" aria-label="Editor view">
        {VIEWS.map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={view === id} className={view === id ? 'on' : ''} onClick={() => setView(id)}>{label}</button>
        ))}
        <span className="admin-hint admin-viewtabs-count">{words} words · {Math.max(1, Math.ceil(words / 200))} min read</span>
      </div>

      {view !== 'seo' && (
        <div className={`builder-editor view-${view}`}>
          {view !== 'preview' && (
            <div className="builder-write">
              <Toolbar area={area} text={bodyText} onText={setBody} />
              <textarea
                ref={area}
                className="builder-textarea"
                value={bodyText}
                onChange={(e) => setBody(e.target.value)}
                placeholder={'Write here. Use the buttons above, or type:\n\n## A heading\n\nA paragraph with **bold**, *italic* and a [link](https://example.com).\n\n- a bullet\n\n```\ncode\n```\n\nPaste or drop an image to add it.'}
                {...handlers}
              />
              {pasteError && <p className="admin-error">{pasteError}</p>}
            </div>
          )}
          {view !== 'write' && (
            <div className="builder-preview">
              <div className="admin-paper">
                <h1>{post.title || 'Untitled post'}</h1>
                <p className="admin-paper-meta">{day} · {Math.max(1, Math.ceil(words / 200))} min read</p>
                {blocks.length ? (
                  <div className="blog-post-body"><PortableText value={blocks} components={portableComponents} /></div>
                ) : (
                  <p className="admin-hint">The preview appears here as you write.</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {view === 'seo' && <SeoPanel post={post} origin={origin} />}
    </div>
  )
}
