import { useEffect, useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { ArrowLeft, Check, Eye, EyeOff, Link2, ListChecks, Pencil, Plus, RotateCcw, Share2, Trash2 } from 'lucide-react'
import { useRowMenu } from '../RowMenu.jsx'
import { adminFetch } from '../http.js'
import { applyRename, restoreTags, tagsBefore } from '../tagTools.js'
import { publishSummary, removeMany, restoreMany, restoreStatuses, setStatus, statusesOf } from '../bulkTools.js'
import TagsManager from '../builder/TagsManager.jsx'
import { copyText, postUrl, shareLink } from '../linkTools.js'
import { forgetRecentPost, noteRecentPost } from '../recentPosts.js'
import usePostBackup, { applyBackup } from '../usePostBackup.js'
import useAdminContent from '../useAdminContent.js'
import useUnsavedChangesWarning from '../useUnsavedChangesWarning.js'
import SaveBar from '../SaveBar.jsx'
import Pager, { paginate } from '../Pager.jsx'
import { takeIntent } from '../intents.js'
import PostForm from '../builder/PostForm.jsx'
import { validatePosts } from '../validate.js'
import { useAdmin, usePanel, useRefresh } from '../AdminContext.jsx'
import { IS_APP, slide, useEdgeSwipeBack } from '../app.js'
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
  const [page, setPage] = useState(1)
  const rowMenu = useRowMenu()
  const [restoredFrom, setRestoredFrom] = useState(null)
  // On phones the list and the editor are two screens; this says which one.
  const [editing, setEditing] = useState(false)
  const editingRef = useRef(false)
  editingRef.current = editing
  const mainRef = useRef(null)
  const skipSlide = useRef(false)
  const started = useRef(false)
  const autoRestored = useRef(false)
  // Bulk actions: tick several posts, then publish, make drafts or delete them together.
  const [selecting, setSelecting] = useState(false)
  const [picked, setPicked] = useState(() => new Set())
  const [batchSaving, setBatchSaving] = useState(false)

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

  // Reset the editor when the saved posts actually change (first load, a
  // save, or a "load latest" you asked for). A refetch that brings back the
  // same content must not wipe edits you are making, or writing just restored.
  const lastLoaded = useRef(null)
  const forceReset = useRef(false)
  useEffect(() => {
    if (pub.data && drafts.data) {
      const merged = merge(pub.data, drafts.data)
      const json = JSON.stringify(merged)
      if (json === lastLoaded.current && !forceReset.current) return
      lastLoaded.current = json
      forceReset.current = false
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
    forceReset.current = true
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
  }, [list]) // eslint-disable-line react-hooks/exhaustive-deps

  // In the app, unsaved writing left on this device is put straight back and
  // its post reopened, so you carry on where you stopped. (In a browser tab
  // the banner asks first.)
  useEffect(() => {
    if (!IS_APP || autoRestored.current || !list || !backup.offer) return
    autoRestored.current = true
    restoreBackup()
    toast('Picked up where you left off. Not saved yet.')
  }, [backup.offer, list]) // eslint-disable-line react-hooks/exhaustive-deps

  // "New post" from the app icon, and things shared to the app from another app.
  // The latest functions are kept in a ref so the listener never uses stale state.
  const phoneActions = useRef(null)
  phoneActions.current = { addPost, startFromShare, openBySlug }
  useEffect(() => {
    if (!list) return
    const run = () => {
      if (takeIntent('new-post')) phoneActions.current.addPost()
      const shared = takeIntent('share')
      if (shared) phoneActions.current.startFromShare(shared.shared)
      const wanted = takeIntent('open-post')
      if (wanted) phoneActions.current.openBySlug(wanted.slug)
    }
    run()
    window.addEventListener('admin:intent', run)
    return () => window.removeEventListener('admin:intent', run)
  }, [list !== null]) // eslint-disable-line react-hooks/exhaustive-deps

  const opened = list?.find((x) => x._id === activeId)
  useEffect(() => {
    if (!opened?.slug) return undefined
    const t = setTimeout(() => noteRecentPost({ slug: opened.slug, title: opened.title }), 800)
    return () => clearTimeout(t)
  }, [opened?.slug, opened?.title]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!list) return <p className="admin-hint admin-loading">Loading posts…</p>
  const loadError = (!pub.data && pub.error) || (!drafts.data && drafts.error)
  if (loadError) return <p className="admin-error">{loadError}</p>

  const active = list.find((p) => p._id === activeId) || null
  const sorted = [...list].sort((a, b) => String(b.publishedAt).localeCompare(String(a.publishedAt)))
  const shown = sorted.filter((p) => tab === 'all' || postState(p) === tab)
  const paged = paginate(shown, page, 8)
  const counts = Object.fromEntries(TABS.map(([id]) => [id, id === 'all' ? list.length : list.filter((p) => postState(p) === id).length]))

  const update = (id, next) => setList((l) => l.map((p) => (p._id === id ? next : p)))
  function addPost() {
    setPage(1)
    setTab('all')
    const post = blankPost()
    setList((l) => [post, ...l])
    setActiveId(post._id)
    setTab('all')
    openPost(post._id)
  }
  // Turns what was shared from another app into a new draft: text and links
  // go in the body, images are optimised, uploaded and placed in the body too.
  async function startFromShare(given) {
    const shared = given || (await takeShared())
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
    paths.forEach((p) => parts.push(`![](${p})`))
    const post = blankPost({ title: shared.title || '', slug: slugify(shared.title), body: textToBlocks(parts.join('\n\n')) })
    setList((l) => [post, ...l])
    setTab('all')
    openPost(post._id)
    toast('New draft started from what you shared')
  }

  function restoreBackup() {
    const offer = backup.offer
    setList((l) => applyBackup(l, offer))
    setRestoreCount((n) => n + 1)
    backup.accept()
    const first = offer.changed.find((p) => !offer.deleted.includes(p._id))?._id
    if (first) openPost(first)
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
  // Deleting leaves the list at once and shows Undo; nothing is final until you save.
  function remove(id) {
    const at = list.findIndex((x) => x._id === id)
    const gone = list[at]
    if (!gone) return
    setList((l) => l.filter((x) => x._id !== id))
    setActiveId(null)
    closeEditor()
    if (gone.slug) forgetRecentPost(gone.slug)
    toast(`Deleted “${gone.title || 'Untitled post'}”`, {
      action: { label: 'Undo', onClick: () => setList((l) => (l.some((x) => x._id === id) ? l : [...l.slice(0, at), gone, ...l.slice(at)])) },
      duration: 7000,
    })
  }

  function setPostStatus(id, status) {
    setList((l) => l.map((x) => (x._id === id ? { ...x, status } : x)))
  }

  // ---- Bulk actions and tag renaming. They change the list on screen only (Undo is offered);
  // nothing is on the site until the usual Save.
  const pickedIds = [...picked].filter((id) => list.some((p) => p._id === id))
  const togglePick = (id) =>
    setPicked((s) => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  function toggleSelecting() {
    setSelecting((on) => !on)
    setPicked(new Set())
  }
  const many = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`

  function bulkStatus(status) {
    const prev = statusesOf(list, pickedIds)
    const ids = pickedIds.filter((id) => prev.get(id) !== status)
    setPicked(new Set())
    if (!ids.length) return toast(status === 'draft' ? 'They are all drafts already.' : 'They are all published already.')
    const next = setStatus(list, ids, status)
    setList(next)
    const what = status === 'draft' ? `Moved ${many(ids.length, 'post')} to drafts` : publishSummary(next, ids)
    toast(`${what}. Save to put it on your site.`, { action: { label: 'Undo', onClick: () => setList((l) => restoreStatuses(l, prev)) }, duration: 8000 })
  }

  async function bulkDelete() {
    const ids = pickedIds
    if (!ids.length) return
    const ok = await confirm({
      title: `Delete ${many(ids.length, 'post')}?`,
      body: 'They leave the list now and are removed from your site when you save. You can undo it until then.',
      confirmLabel: 'Delete',
      tone: 'danger',
    })
    if (!ok) return
    const { list: rest, removed } = removeMany(list, ids)
    setList(rest)
    setPicked(new Set())
    if (ids.includes(activeId)) {
      setActiveId(null)
      closeEditor()
    }
    removed.forEach(({ post }) => post.slug && forgetRecentPost(post.slug))
    toast(`Deleted ${many(removed.length, 'post')}`, { action: { label: 'Undo', onClick: () => setList((l) => restoreMany(l, removed)) }, duration: 8000 })
  }

  function renameTag(from, to) {
    const next = applyRename(list, from, to)
    const prev = tagsBefore(list, next)
    setList(next)
    toast(`Renamed “${from}” to “${to}” in ${many(prev.size, 'post')}. Save to put it on your site.`, {
      action: { label: 'Undo', onClick: () => setList((l) => restoreTags(l, prev)) },
      duration: 8000,
    })
  }

  async function shareOut(post) {
    const result = await shareLink({ title: post.title || 'A post', url: postUrl(post) })
    if (result === 'copied') toast('Link copied. Paste it anywhere.', { tone: 'ok' })
    else if (result === 'failed') toast('Could not share the link.', { tone: 'error' })
  }

  // Opens the post with this address (from a shortcut on the app icon, or the search).
  function openBySlug(slug) {
    const found = list?.find((x) => x.slug === slug)
    if (found) openPost(found._id)
    else toast('That post is not in the list any more.', { tone: 'error' })
  }

  // What the press-and-hold (or right-click) menu offers for one post.
  function postActions(post) {
    const live = postState(post) === 'published' && post.slug
    return [
      { label: 'Open', icon: Pencil, onSelect: () => openPost(post._id) },
      ...(live
        ? [
            { label: 'Share', icon: Share2, onSelect: () => shareOut(post) },
            { label: 'Copy link', icon: Link2, onSelect: async () => toast((await copyText(postUrl(post))) ? 'Link copied' : 'Could not copy the link', { tone: 'ok' }) },
          ]
        : []),
      post.status === 'draft'
        ? { label: 'Publish', icon: Eye, onSelect: () => setPostStatus(post._id, 'published') }
        : { label: 'Make a draft', icon: EyeOff, onSelect: () => setPostStatus(post._id, 'draft') },
      { label: 'Delete', icon: Trash2, tone: 'danger', onSelect: () => remove(post._id) },
    ]
  }

  // When posts and drafts both changed (a post was published or made a draft), they are
  // saved in ONE commit: all or nothing, so a failure cannot leave a post in both files or
  // in neither, and the site rebuilds once. A change to just one file is saved as before.
  async function saveAll() {
    const pubChanged = JSON.stringify(parts.published) !== JSON.stringify(pub.data)
    const draftsChanged = JSON.stringify(parts.drafts) !== JSON.stringify(drafts.data)
    if (pubChanged && draftsChanged) {
      setBatchSaving(true)
      try {
        const res = await adminFetch('/api/admin/content?batch=1', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            files: [
              { type: 'posts', data: parts.published, sha: pub.sha },
              { type: 'drafts', data: parts.drafts, sha: drafts.sha },
            ],
          }),
        })
        const body = await res.json().catch(() => ({}))
        if (!res.ok) throw Object.assign(new Error(body.error || 'Failed to save.'), { status: res.status })
        pub.applySaved(parts.published, body.shas?.posts, body.commit)
        drafts.applySaved(parts.drafts, body.shas?.drafts, body.commit)
        return true
      } catch (err) {
        const conflict = err.status === 409 || /\b409\b|does not match/i.test(err.message)
        pub.fail(conflict ? 'This content was changed somewhere else (another tab, or a push from your computer) since you opened it.' : err.message, conflict)
        return false
      } finally {
        setBatchSaving(false)
      }
    }
    let ok = true
    if (pubChanged) ok = await pub.save(parts.published)
    if (ok && draftsChanged) ok = await drafts.save(parts.drafts)
    return ok
  }

  const latest = (drafts.savedAt || 0) > (pub.savedAt || 0) ? drafts : pub
  const bar = {
    saving: pub.saving || drafts.saving || batchSaving,
    error: pub.error || drafts.error,
    conflict: pub.conflict || drafts.conflict,
    savedAt: latest.savedAt,
    commit: latest.commit,
    dirty,
    restoredFrom,
    errors: validatePosts(list),
    onReload: () => { forceReset.current = true; pub.reload(); drafts.reload() },
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
            <button type="button" className="admin-btn" onClick={restoreBackup}>
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
          <div className="admin-list-tools">
            <button type="button" className="admin-btn-ghost admin-btn-icon-text" aria-pressed={selecting} onClick={toggleSelecting}>
              <ListChecks size={15} aria-hidden="true" /> {selecting ? 'Done' : 'Select'}
            </button>
            <TagsManager list={list} onRename={renameTag} />
          </div>
          {selecting && (
            <div className="admin-select-bar" role="toolbar" aria-label="Actions for the selected posts">
              <span className="admin-select-count">{pickedIds.length === 0 ? 'Tap posts to select them' : `${pickedIds.length} selected`}</span>
              <span className="admin-select-links">
                {pickedIds.length < shown.length && (
                  <button type="button" className="admin-link-btn" onClick={() => setPicked(new Set(shown.map((p) => p._id)))}>All {shown.length}</button>
                )}
                {pickedIds.length > 0 && <button type="button" className="admin-link-btn" onClick={() => setPicked(new Set())}>Clear</button>}
              </span>
              <span className="admin-select-actions">
                <button type="button" className="admin-btn admin-btn-icon-text" onClick={() => bulkStatus('published')} disabled={!pickedIds.length}>
                  <Eye size={15} aria-hidden="true" /> Publish
                </button>
                <button type="button" className="admin-btn-ghost admin-btn-icon-text" onClick={() => bulkStatus('draft')} disabled={!pickedIds.length}>
                  <EyeOff size={15} aria-hidden="true" /> Make drafts
                </button>
                <button type="button" className="admin-btn-danger admin-btn-icon-text" onClick={bulkDelete} disabled={!pickedIds.length}>
                  <Trash2 size={15} aria-hidden="true" /> Delete
                </button>
              </span>
            </div>
          )}
          <div className="admin-viewtabs" role="tablist" aria-label="Filter posts">
            {TABS.map(([id, name]) => (
              <button key={id} type="button" role="tab" aria-selected={tab === id} className={tab === id ? 'on' : ''} onClick={() => { setTab(id); setPage(1) }}>
                {name} <span className="admin-count">{counts[id]}</span>
              </button>
            ))}
          </div>
          <ul>
            {paged.items.map((p) => (
              <li key={p._id} {...rowMenu.bind(p.title || 'Untitled post', () => postActions(p))}>
                <button
                  type="button"
                  className={`${p._id === activeId && !selecting ? 'on' : ''} ${selecting ? 'is-picking' : ''} ${picked.has(p._id) ? 'is-picked' : ''}`}
                  role={selecting ? 'checkbox' : undefined}
                  aria-checked={selecting ? picked.has(p._id) : undefined}
                  onClick={() => (selecting ? togglePick(p._id) : openPost(p._id))}
                >
                  {selecting && <i className="admin-pick" aria-hidden="true">{picked.has(p._id) && <Check size={14} />}</i>}
                  <strong>{p.title || 'Untitled post'}</strong>
                  <span><i className={`admin-dot is-${postState(p)}`} />{label[postState(p)]} · {String(p.publishedAt).slice(0, 10)}</span>
                </button>
              </li>
            ))}
            {shown.length === 0 && <li className="admin-hint">Nothing here yet.</li>}
          </ul>
          <Pager p={paged} onPage={setPage} compact label="posts" />
          {rowMenu.element}
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
