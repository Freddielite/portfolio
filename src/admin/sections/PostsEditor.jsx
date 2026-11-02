import { useEffect, useMemo, useState } from 'react'
import useAdminContent from '../useAdminContent.js'
import useUnsavedChangesWarning from '../useUnsavedChangesWarning.js'
import SaveBar from '../SaveBar.jsx'
import PostForm from '../builder/PostForm.jsx'
import { validatePosts } from '../validate.js'
import { postState, todayString } from '../../lib/postStatus.js'

// Published posts live in content/posts.json, drafts in content/drafts.json (which
// the public site never imports, so draft text does not ship with the site). The
// editor shows them as one list and sorts them into the right file on save.
const merge = (published, drafts) => [
  ...published,
  ...drafts.map((d) => ({ ...d, status: 'draft' })),
]
const split = (list) => ({
  published: list.filter((p) => p.status !== 'draft').map(({ status, ...rest }) => rest),
  drafts: list.filter((p) => p.status === 'draft').map((p) => ({ ...p, status: 'draft' })),
})

const TABS = [['all', 'All'], ['published', 'Published'], ['draft', 'Drafts'], ['scheduled', 'Scheduled']]
const label = { draft: 'Draft', published: 'Live', scheduled: 'Scheduled' }

export default function PostsEditor() {
  const pub = useAdminContent('posts')
  const drafts = useAdminContent('drafts', { optional: true })
  const [list, setList] = useState(null)
  const [activeId, setActiveId] = useState(null)
  const [tab, setTab] = useState('all')
  const [restoredFrom, setRestoredFrom] = useState(null)

  useEffect(() => {
    if (pub.data && drafts.data) {
      const merged = merge(pub.data, drafts.data)
      setList(merged)
      setRestoredFrom(null)
      setActiveId((id) => (id && merged.some((p) => p._id === id) ? id : merged[0]?._id || null))
    }
  }, [pub.data, drafts.data])

  const parts = useMemo(() => (list ? split(list) : null), [list])
  const dirty = !!parts && (JSON.stringify(parts.published) !== JSON.stringify(pub.data) || JSON.stringify(parts.drafts) !== JSON.stringify(drafts.data))
  useUnsavedChangesWarning(dirty)

  if (pub.loading || drafts.loading || !list) return <p className="admin-hint">Loading…</p>
  const loadError = (!pub.data && pub.error) || (!drafts.data && drafts.error)
  if (loadError) return <p className="admin-error">{loadError}</p>

  const active = list.find((p) => p._id === activeId) || null
  const sorted = [...list].sort((a, b) => String(b.publishedAt).localeCompare(String(a.publishedAt)))
  const shown = sorted.filter((p) => tab === 'all' || postState(p) === tab)
  const counts = Object.fromEntries(TABS.map(([id]) => [id, id === 'all' ? list.length : list.filter((p) => postState(p) === id).length]))

  const update = (id, next) => setList((l) => l.map((p) => (p._id === id ? next : p)))
  function addPost() {
    const post = { _id: `p${Date.now()}`, slug: '', title: '', excerpt: '', publishedAt: todayString(), status: 'draft', coverImage: null, tags: [], body: [] }
    setList((l) => [post, ...l])
    setActiveId(post._id)
    setTab('all')
  }
  function remove(id) {
    const p = list.find((x) => x._id === id)
    if (!confirm(`Delete "${p?.title || 'this post'}"? You can bring it back from History until you do other saves.`)) return
    setList((l) => l.filter((x) => x._id !== id))
    setActiveId(null)
  }

  async function saveAll() {
    let ok = true
    if (JSON.stringify(parts.published) !== JSON.stringify(pub.data)) ok = await pub.save(parts.published)
    if (ok && JSON.stringify(parts.drafts) !== JSON.stringify(drafts.data)) ok = await drafts.save(parts.drafts)
    return ok
  }

  const latest = (drafts.savedAt || 0) > (pub.savedAt || 0) ? drafts : pub
  const bar = {
    saving: pub.saving || drafts.saving,
    error: pub.error || drafts.error,
    conflict: pub.conflict || drafts.conflict,
    savedAt: latest.savedAt,
    commit: latest.commit,
    dirty,
    restoredFrom,
    errors: validatePosts(list),
    onReload: () => { pub.reload(); drafts.reload() },
    type: 'posts',
    onRestore: (d, c) => {
      setList((l) => [...d, ...l.filter((p) => p.status === 'draft')])
      setRestoredFrom(c)
    },
    onSave: saveAll,
  }
  const origin = typeof window !== 'undefined' ? window.location.origin : ''

  return (
    <div className="admin-section builder">
      <SaveBar {...bar} />

      <div className="builder-layout">
        <aside className="builder-list">
          <button type="button" className="admin-btn" onClick={addPost}>+ New post</button>
          <div className="admin-viewtabs" role="tablist" aria-label="Filter posts">
            {TABS.map(([id, name]) => (
              <button key={id} type="button" role="tab" aria-selected={tab === id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>
                {name} <span className="admin-count">{counts[id]}</span>
              </button>
            ))}
          </div>
          <ul>
            {shown.map((p) => (
              <li key={p._id}>
                <button type="button" className={p._id === activeId ? 'on' : ''} onClick={() => setActiveId(p._id)}>
                  <strong>{p.title || 'Untitled post'}</strong>
                  <span><i className={`admin-dot is-${postState(p)}`} />{label[postState(p)]} · {String(p.publishedAt).slice(0, 10)}</span>
                </button>
              </li>
            ))}
            {shown.length === 0 && <li className="admin-hint">Nothing here yet.</li>}
          </ul>
        </aside>

        <div className="builder-main">
          {active ? (
            <PostForm
              key={active._id}
              post={active}
              origin={origin}
              savedLive={(pub.data || []).some((p) => p._id === active._id)}
              onChange={(next) => update(active._id, next)}
              onDelete={() => remove(active._id)}
            />
          ) : (
            <p className="admin-hint">Pick a post on the left, or start a new one.</p>
          )}
        </div>
      </div>

      <SaveBar {...bar} />
    </div>
  )
}
