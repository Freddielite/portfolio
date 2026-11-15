import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CornerDownLeft, Search, X } from 'lucide-react'
import { buildItems, loadSearchIndex, searchItems } from './searchIndex.js'
import { pushIntent } from './intents.js'

const phone = () => window.matchMedia('(max-width: 860px)').matches

// Find any post, project, skill, testimonial or section, and jump to it.
// Opens with Ctrl+K (Cmd+K on a Mac) or "/" on a keyboard, or from the search button.
export default function SearchPalette({ sections, go, onClose, onGone }) {
  const [query, setQuery] = useState('')
  const [index, setIndex] = useState(null)
  const [at, setAt] = useState(0)
  const inputRef = useRef(null)
  const listRef = useRef(null)

  useEffect(() => {
    let live = true
    loadSearchIndex().then((v) => live && setIndex(v))
    inputRef.current?.focus()
    return () => {
      live = false
    }
  }, [])

  // The phone's Back button (the history step is taken by whoever opens the search).
  useEffect(() => {
    if (!phone()) return undefined
    const onPop = () => {
      if (!window.history.state?.adminPopup) onGone()
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [onGone])

  const actions = useMemo(
    () => [{ label: 'New post', sub: 'Start a blank post', words: 'write create add blog', run: () => { pushIntent({ kind: 'new-post' }); go('posts') } }],
    [go]
  )
  const items = useMemo(() => buildItems(index || {}, sections, actions), [index, sections, actions])
  const results = useMemo(() => searchItems(items, query), [items, query])
  const shownAt = Math.min(at, Math.max(0, results.length - 1))

  useEffect(() => setAt(0), [query])
  useEffect(() => {
    listRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [shownAt, results])

  const choose = useCallback(
    (item) => {
      if (!item) return
      onClose(() => {
        if (item.run) return item.run()
        if (item.slug) pushIntent({ kind: 'open-post', slug: item.slug })
        if (item.index !== undefined) pushIntent({ kind: 'open-project', index: item.index })
        go(item.tab)
      })
    },
    [go, onClose]
  )

  function onKeyDown(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setAt((i) => Math.min(results.length - 1, i + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setAt((i) => Math.max(0, i - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      choose(results[shownAt])
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    }
  }

  let lastGroup = null
  const root = document.querySelector('.admin-page') || document.body
  return createPortal(
    <div className="admin-search-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="admin-search" role="dialog" aria-modal="true" aria-label="Search the admin">
        <div className="admin-search-field">
          <Search size={18} aria-hidden="true" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search posts, projects, skills…"
            aria-label="Search"
            role="combobox"
            aria-expanded="true"
            aria-controls="admin-search-list"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            enterKeyHint="go"
          />
          <button type="button" className="admin-search-close" aria-label="Close search" onClick={onClose}><X size={18} aria-hidden="true" /></button>
        </div>
        <ul id="admin-search-list" ref={listRef} className="admin-search-list" role="listbox">
          {results.map((item, i) => {
            const heading = item.group !== lastGroup ? item.group : null
            lastGroup = item.group
            return (
              <li key={`${item.group}-${item.label}-${i}`} role="presentation">
                {heading && <p className="admin-search-group">{heading}</p>}
                <button
                  type="button"
                  role="option"
                  aria-selected={i === shownAt}
                  className={`admin-search-row ${i === shownAt ? 'is-on' : ''}`}
                  onMouseMove={() => i !== shownAt && setAt(i)}
                  onClick={() => choose(item)}
                >
                  <span className="admin-search-label">{item.label}</span>
                  <span className="admin-search-sub">{item.sub}</span>
                </button>
              </li>
            )
          })}
          {!results.length && <li className="admin-search-empty">{index ? `Nothing matches “${query}”.` : 'Looking…'}</li>}
          {index === null && results.length > 0 && <li className="admin-search-empty">Loading your content…</li>}
        </ul>
        <p className="admin-search-hint" aria-hidden="true">
          <span><kbd>↑</kbd> <kbd>↓</kbd> move</span>
          <span><kbd><CornerDownLeft size={11} /></kbd> open</span>
          <span><kbd>Esc</kbd> close</span>
        </p>
      </div>
    </div>,
    root
  )
}
