import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Plus, RotateCcw } from 'lucide-react'
import usePostBackup, { applyBackup } from '../usePostBackup.js'
import useAdminContent from '../useAdminContent.js'
import useUnsavedChangesWarning from '../useUnsavedChangesWarning.js'
import SaveBar from '../SaveBar.jsx'
import PostForm from '../builder/PostForm.jsx'
import { validatePosts } from '../validate.js'
import { useAdmin } from '../AdminContext.jsx'
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
  const { confirm } = useAdmin()
  const [list, setList] = useState(null)
  const [activeId, setActiveId] = useState(null)
  const [tab, setTab] = useState('all')
  const [restoredFrom, setRestoredFrom] = useState(null)
  // On phones the list and the editor are two screens; this says which one.
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    if (pub.data && drafts.data) {
      const merged = merge(pub.data, drafts.data)
      setList(merged)
      setRestoredFrom(null)
      setActiveId((id) => (id && merged.some((p) => p._id === id) ? id : merged[0]?._id || null))
    }
  }, [pub.data, drafts.data])

  const base = useMemo(() => (pub.data && drafts.data ? merge(pub.data, drafts.data) : null), [pub.data, drafts.data])
  const backup = usePostBackup(list, base)
  // Bumped when a backup is restored, so the open editor reloads its text.
  const [restoreCount, setRestoreCount] = useState(0)

  const parts = useMemo(() => (list ? split(list) : null), [list])
  const dirty = !!parts && (JSON.stringify(parts.published) !== JSON.stringify(pub.data) || JSON.stringify(parts.drafts) !== JSON.stringify(drafts.data))
  useUnsavedChangesWarning(dirty)

  if (pub.loading || drafts.loading || !list) return <p className="admin-hint admin-loading">Loading posts…</p>
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
    openPost(post._id)
  }
  function openPost(id) {
    setActiveId(id)
    setEditing(true)
    if (window.matchMedia('(max-width: 899px)').matches) window.scrollTo(0, 0)
  }
  async function remove(id) {
    const p = list.find((x) => x._id === id)
    const ok = await confirm({
      title: `Delete “${p?.title || 'Untitled post'}”?`,
      body: 'It leaves the list now and your site when you save. History can bring it back.',
      confirmLabel: 'Delete post',
      tone: 'danger',
    })
    if (!ok) return
    setList((l) => l.filter((x) => x._id !== id))
    setActiveId(null)
    setEditing(false)
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
    onDiscard: () => {
      const merged = merge(pub.data, drafts.data)
      setList(merged)
      setRestoredFrom(null)
      if (!merged.some((p) => p._id === activeId)) {
        setActiveId(merged[0]?._id || null)
        setEditing(false)
      }
    },
  }
  const origin = typeof window !== 'undefined' ? window.location.origin : ''

  return (
    <div className={`admin-section builder ${editing ? 'is-editing' : ''}`}>
      <SaveBar {...bar} />

      {backup.offer && (
        <div className="admin-banner" role="status">
          <RotateCcw size={18} aria-hidden="true" />
          <div>
            <strong>You have unsaved writing on this device</strong>
            <p className="admin-hint">
              From {new Date(backup.offer.at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              {backup.offer.changed.length > 0 && <>: {backup.offer.changed.map((p) => `“${p.title || 'Untitled post'}”`).join(', ')}</>}
              {backup.offer.deleted.length > 0 && <>{backup.offer.changed.length ? ', plus ' : ': '}{backup.offer.deleted.length} deleted</>}
              . It is not on your site yet.
            </p>
          </div>
          <div className="admin-banner-actions">
            <button
              type="button"
              className="admin-btn"
              onClick={() => {
                const next = applyBackup(list, backup.offer)
                setList(next)
                const first = backup.offer.changed[0]?._id
                if (first) {
                  setActiveId(first)
                  setEditing(true)
                }
                setRestoreCount((n) => n + 1)
                backup.accept()
              }}
            >
              Restore it
            </button>
            <button type="button" className="admin-btn-ghost" onClick={async () => {
              const ok = await confirm({
                title: 'Throw away the unsaved writing?',
                body: 'The copy kept on this device is deleted. It was never saved to your site, so it cannot be brought back.',
                confirmLabel: 'Throw it away',
                tone: 'danger',
              })
              if (ok) backup.dismiss()
            }}>
              Discard
            </button>
          </div>
        </div>
      )}

      <div className="builder-layout">
        <aside className="builder-list">
          <button type="button" className="admin-btn admin-btn-icon-text" onClick={addPost}><Plus size={16} aria-hidden="true" /> New post</button>
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
                <button type="button" className={p._id === activeId ? 'on' : ''} onClick={() => openPost(p._id)}>
                  <strong>{p.title || 'Untitled post'}</strong>
                  <span><i className={`admin-dot is-${postState(p)}`} />{label[postState(p)]} · {String(p.publishedAt).slice(0, 10)}</span>
                </button>
              </li>
            ))}
            {shown.length === 0 && <li className="admin-hint">Nothing here yet.</li>}
          </ul>
        </aside>

        <div className="builder-main">
          <button type="button" className="admin-back" onClick={() => setEditing(false)}>
            <ArrowLeft size={17} aria-hidden="true" /> All posts
          </button>
          {active ? (
            <PostForm
              key={`${active._id}:${restoreCount}`}
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

    </div>
  )
}
