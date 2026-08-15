import { useEffect, useState } from 'react'
import useAdminContent from '../useAdminContent.js'
import SaveBar from '../SaveBar.jsx'
import ImageUploader from '../ImageUploader.jsx'
import { blocksToText, textToBlocks } from '../portableText.js'

function slugify(str) {
  return String(str || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function blankPost() {
  const today = new Date().toISOString().slice(0, 10)
  return {
    _id: `p${Date.now()}`,
    slug: '',
    title: 'New post',
    excerpt: '',
    publishedAt: today,
    coverImage: null,
    body: [],
  }
}

function PostForm({ post, onChange, onDelete }) {
  const [bodyText, setBodyText] = useState(() => blocksToText(post.body))
  const [autoSlug, setAutoSlug] = useState(!post.slug)

  useEffect(() => {
    setBodyText(blocksToText(post.body))
  }, [post._id]) // eslint-disable-line react-hooks/exhaustive-deps

  function set(key, value) {
    onChange({ ...post, [key]: value })
  }

  function setTitle(title) {
    if (autoSlug) {
      onChange({ ...post, title, slug: slugify(title) })
    } else {
      set('title', title)
    }
  }

  function setBody(text) {
    setBodyText(text)
    set('body', textToBlocks(text))
  }

  return (
    <div className="admin-card">
      <div className="admin-card-header">
        <strong>{post.title || 'Untitled post'}</strong>
        <button type="button" className="admin-btn-danger" onClick={onDelete}>Delete</button>
      </div>

      <div className="admin-field">
        <label className="admin-label">Title</label>
        <input value={post.title} onChange={(e) => setTitle(e.target.value)} />
      </div>

      <div className="admin-field">
        <label className="admin-label">Slug (URL path: /blog/&lt;slug&gt;)</label>
        <input
          value={post.slug}
          onChange={(e) => {
            setAutoSlug(false)
            set('slug', slugify(e.target.value))
          }}
        />
      </div>

      <div className="admin-grid-2">
        <div className="admin-field">
          <label className="admin-label">Published date</label>
          <input type="date" value={post.publishedAt?.slice(0, 10) || ''} onChange={(e) => set('publishedAt', e.target.value)} />
        </div>
      </div>

      <div className="admin-field">
        <label className="admin-label">Excerpt</label>
        <textarea rows={3} value={post.excerpt} onChange={(e) => set('excerpt', e.target.value)} />
      </div>

      <ImageUploader label="Cover image" value={post.coverImage} onChange={(v) => set('coverImage', v)} folder="blog" />

      <div className="admin-field">
        <label className="admin-label">Body</label>
        <textarea rows={12} value={bodyText} onChange={(e) => setBody(e.target.value)} />
        <p className="admin-hint">Separate paragraphs with a blank line. No other formatting needed.</p>
      </div>
    </div>
  )
}

export default function PostsEditor() {
  const { data, loading, saving, error, savedAt, save } = useAdminContent('posts')
  const [list, setList] = useState(null)
  const [activeId, setActiveId] = useState(null)

  useEffect(() => {
    if (data) {
      setList(data)
      if (data.length && !activeId) setActiveId(data[0]._id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data])

  if (loading || !list) return <p className="admin-hint">Loading…</p>

  const dirty = JSON.stringify(list) !== JSON.stringify(data)
  const active = list.find((p) => p._id === activeId) || null

  function updateActive(post) {
    setList((l) => l.map((p) => (p._id === activeId ? post : p)))
  }
  function addPost() {
    const post = blankPost()
    setList((l) => [post, ...l])
    setActiveId(post._id)
  }
  function deleteActive() {
    if (!confirm('Delete this post?')) return
    setList((l) => l.filter((p) => p._id !== activeId))
    setActiveId(null)
  }

  return (
    <div className="admin-section admin-posts-layout">
      <SaveBar saving={saving} error={error} savedAt={savedAt} dirty={dirty} onSave={() => save(list)} />

      <div className="admin-posts-grid">
        <div className="admin-posts-list">
          <button type="button" className="admin-btn-ghost admin-btn-add" onClick={addPost}>
            + New post
          </button>
          {list.map((p) => (
            <button
              key={p._id}
              type="button"
              className={`admin-post-list-item ${p._id === activeId ? 'is-active' : ''}`}
              onClick={() => setActiveId(p._id)}
            >
              <span>{p.title || 'Untitled'}</span>
              <span className="admin-hint">{p.publishedAt?.slice(0, 10)}</span>
            </button>
          ))}
        </div>

        <div className="admin-posts-detail">
          {active ? (
            <PostForm post={active} onChange={updateActive} onDelete={deleteActive} />
          ) : (
            <p className="admin-hint">Select a post, or create a new one.</p>
          )}
        </div>
      </div>

      <SaveBar saving={saving} error={error} savedAt={savedAt} dirty={dirty} onSave={() => save(list)} />
    </div>
  )
}
