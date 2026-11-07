import { useEffect, useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { ArrowLeft, Plus, RotateCcw } from 'lucide-react'
import usePostBackup, { applyBackup } from '../usePostBackup.js'
import useAdminContent from '../useAdminContent.js'
import useUnsavedChangesWarning from '../useUnsavedChangesWarning.js'
import SaveBar from '../SaveBar.jsx'
import PostForm from '../builder/PostForm.jsx'
import { validatePosts } from '../validate.js'
import { useAdmin, usePanel, useRefresh } from '../AdminContext.jsx'
import { IS_APP, readLastPlace, saveLastPlace, slide, useEdgeSwipeBack } from '../app.js'
import { takeShared } from '../share.js'
import { uploadImage } from '../imageUpload.js'
import { textToBlocks } from '../portableText.js'
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

const slugify = (t) => String(t || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

const blankPost = (extra = {}) => ({
  _id: `p${Date.now()}`, slug: '', title: '', excerpt: '', publishedAt: todayString(), status: 'draft', coverImage: null, tags: [], body: [], ...extra,
})

const TABS = [['all', 'All'], ['published', 'Published'], ['draft', 'Drafts'], ['scheduled', 'Scheduled']]
const label = { draft: 'Draft', published: 'Live', scheduled: 'Scheduled' }

export default function PostsEditor() {
  const pub = useAdminContent('posts')
  const drafts = useAdminContent('drafts', { optional: true })
  const { confirm, toast } = useAdmin()
  const { active: panelActive } = usePanel()
  const [list, setList] = useState(null)
  const [activeId, setActiveId] = useState(null)
  const [tab, setTab] = useState('all')
  const [restoredFrom, setRestoredFrom] = useState(null)
  // On phones the list and the editor are two screens; this says which one.
  const [editing, setEditing] = useState(false)
  const editingRef = useRef(false)
  editingRef.current = editing
  const mainRef = useRef(null)
  const skipSlide = useRef(false)
  const started = useRef(false)

  const isPhone = () => window.matchMedia('(max-width: 899px)').matches
  // In the app, an open post is a real step in the back history, so Android's
  // back gesture (and the back arrow) returns to the list.
  const appStack = () => IS_APP && isPhone()

  useEffect(() => {
    if (!IS_APP) return
    const onPop = () => {
      if (!editingRef.current || window.history.state?.adminPost) return
      const close = () => {
        flushSync(() => setEditing(false))
        window.scrollTo(0, 0)
      }
      if (skipSlide.current) {
        skipSlide.current = false
        close()
      } else slide('back', close)
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  function closeEditor({ animate = true } = {}) {
    if (appStack() && window.history.state?.adminPost) {
      skipSlide.current = !animate
      window.history.back()
      return
    }
    if (animate) slide('back', () => flushSync(() => setEditing(false)))
    else setEditing(false)
  }

  // iPhone has no system back gesture, so the app adds one: swipe from the left edge.
  useEdgeSwipeBack(mainRef, IS_APP && editing && panelActive, () => closeEditor({ animate: false }))

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

  // Pull to refresh in the app.
  useRefresh(async () => {
    if (dirty) {
      const ok = await confirm({
        title: 'Load the latest posts?',
        body: 'Your unsaved edits to posts are replaced with what is saved on GitHub now. Writing kept on this device stays available to restore.',
        confirmLabel: 'Load latest',
        tone: 'danger',
      })
      if (!ok) return false
    }
    await Promise.all([pub.reload(), drafts.reload()])
  })

  // Once the posts are loaded: open what the app was asked to open (the "New
  // post" shortcut, something shared from another app), or else the post you
  // were last working on.
  useEffect(() => {
    if (!list || started.current) return
    started.current = true
    const params = new URLSearchParams(window.location.search)
    const action = params.get('action')
    const shared = params.get('shared')
    if (action || shared) {
      params.delete('action')
      params.delete('shared')
      const qs = params.toString()
      window.history.replaceState(window.history.state, '', `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash}`)
    }
    if (action === 'new-post') return addPost()
    if (shared) return void startFromShare()
    const last = readLastPlace()
    if (last.post && list.some((p) => p._id === last.post)) {
      if (last.editing && isPhone()) openPost(last.post)
      else setActiveId(last.post)
    }
  }, [list]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (started.current) saveLastPlace({ post: activeId, editing })
  }, [activeId, editing])

  if (!list) return <p className="admin-hint admin-loading">Loading posts…</p>
  const loadError = (!pub.data && pub.error) || (!drafts.data && drafts.error)
  if (loadError) return <p className="admin-error">{loadError}</p>

  const active = list.find((p) => p._id === activeId) || null
  const sorted = [...list].sort((a, b) => String(b.publishedAt).localeCompare(String(a.publishedAt)))
  const shown = sorted.filter((p) => tab === 'all' || postState(p) === tab)
  const counts = Object.fromEntries(TABS.map(([id]) => [id, id === 'all' ? list.length : list.filter((p) => postState(p) === id).length]))

  const update = (id, next) => setList((l) => l.map((p) => (p._id === id ? next : p)))
  function addPost() {
    const post = blankPost()
    setList((l) => [post, ...l])
    setActiveId(post._id)
    setTab('all')
    openPost(post._id)
  }
  // Turns what was shared from another app into a new draft: text and links
  // go in the body, images are optimised, uploaded and placed in the body too.
  async function startFromShare() {
    const shared = await takeShared()
    if (!shared) {
      toast('Nothing came through from the share. Try sharing again.', { tone: 'error' })
      return
    }
    const paths = []
    if (shared.files.length) {
      toast(shared.files.length === 1 ? 'Adding the shared image…' : `Adding ${shared.files.length} shared images…`, { duration: 30000 })
      for (const file of shared.files) {
        try {
          paths.push((await uploadImage(file, 'blog')).path)
        } catch (err) {
          toast(`Could not add ${file.name}: ${err.message}`, { tone: 'error' })
        }
      }
    }
    const text = shared.text.trim()
    const url = shared.url.trim()
    const parts = []
    if (text) parts.push(text)
    if (url && !text.includes(url)) parts.push(`[${shared.title || url}](${url})`)
    paths.forEach((p) => parts.push(`![Describe this image](${p})`))
    const post = blankPost({ title: shared.title || '', slug: slugify(shared.title), body: textToBlocks(parts.join('\n\n')) })
    setList((l) => [post, ...l])
    setTab('all')
    openPost(post._id)
    toast('New draft started from what you shared')
  }

  function openPost(id) {
    if (appStack() && !editingRef.current) {
      window.history.pushState({ adminPost: true }, '', window.location.href)
      slide('forward', () => {
        flushSync(() => {
          setActiveId(id)
          setEditing(true)
        })
        window.scrollTo(0, 0)
      })
      return
    }
    setActiveId(id)
    setEditing(true)
    if (isPhone()) window.scrollTo(0, 0)
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
    closeEditor()
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
        closeEditor({ animate: false })
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

        <div className="builder-main" ref={mainRef}>
          <button type="button" className="admin-back" onClick={() => closeEditor()}>
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
