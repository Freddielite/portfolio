import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronRight, MoreHorizontal } from 'lucide-react'
import { haptic } from './native.js'

// Phones (860px and narrower): the main sections sit in a bar at the bottom,
// in thumb reach, like a native app. Everything else is one tap away under
// More, which opens a sheet. Wider screens keep the sidebar (CSS hides this).
export const PRIMARY = ['overview', 'posts', 'projects', 'subscribers']
export const MORE = ['settings', 'skills', 'testimonials']

export default function TabBar({ tabs, tab, go, dirty }) {
  const byId = Object.fromEntries(tabs.map((t) => [t.id, t]))
  const [moreOpen, setMoreOpen] = useState(false)
  const moreRef = useRef(null)
  const inMore = MORE.includes(tab)
  const moreDirty = MORE.some((id) => dirty.has(id))

  function pick(id) {
    if (id === tab) {
      // Tapping the section you are on takes you back to its top.
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })
      return
    }
    haptic.tap()
    go(id)
  }

  // The sheet is a step in the history, so the phone's Back closes it.
  const openMore = useCallback(() => {
    haptic.tap()
    window.history.pushState({ ...(window.history.state || {}), adminMore: true }, '', window.location.href)
    setMoreOpen(true)
  }, [])

  const closeMore = useCallback(() => {
    if (window.history.state?.adminMore) window.history.back()
    else setMoreOpen(false)
  }, [])

  useEffect(() => {
    const onPop = () => {
      if (!window.history.state?.adminMore) setMoreOpen(false)
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  // Choosing a section from the sheet takes the sheet's place in the history,
  // so Back from that section goes to where you were before More.
  const chooseFromMore = useCallback(
    (id) => {
      setMoreOpen(false)
      if (window.history.state?.adminMore) window.history.replaceState(null, '', `#${id}`)
      go(id)
    },
    [go]
  )

  return (
    <>
      <nav className="admin-tabbar" aria-label="Admin sections">
        {PRIMARY.map((id) => {
          const t = byId[id]
          const active = tab === id
          return (
            <button
              key={id}
              type="button"
              className={`admin-tab ${active ? 'is-active' : ''}`}
              aria-current={active ? 'page' : undefined}
              onClick={() => pick(id)}
            >
              <span className="admin-tab-pill">
                <t.Icon size={20} strokeWidth={active ? 2.3 : 1.9} aria-hidden="true" />
                {dirty.has(id) && <i className="admin-dirty-dot" />}
              </span>
              <span className="admin-tab-label">{t.short}</span>
              {dirty.has(id) && <span className="admin-sr">, unsaved changes</span>}
            </button>
          )
        })}
        <button
          ref={moreRef}
          type="button"
          className={`admin-tab ${inMore ? 'is-active' : ''}`}
          aria-haspopup="dialog"
          aria-expanded={moreOpen}
          aria-current={inMore ? 'page' : undefined}
          onClick={openMore}
        >
          <span className="admin-tab-pill">
            {inMore ? (
              (() => {
                const Icon = byId[tab].Icon
                return <Icon size={20} strokeWidth={2.3} aria-hidden="true" />
              })()
            ) : (
              <MoreHorizontal size={20} strokeWidth={1.9} aria-hidden="true" />
            )}
            {moreDirty && <i className="admin-dirty-dot" />}
          </span>
          <span className="admin-tab-label">{inMore ? byId[tab].short : 'More'}</span>
          {inMore && <span className="admin-sr">, more sections</span>}
          {moreDirty && <span className="admin-sr">, unsaved changes</span>}
        </button>
      </nav>
      {moreOpen && (
        <MoreSheet
          items={MORE.map((id) => byId[id])}
          tab={tab}
          dirty={dirty}
          onPick={chooseFromMore}
          onClose={closeMore}
          returnTo={moreRef}
        />
      )}
    </>
  )
}

function MoreSheet({ items, tab, dirty, onPick, onClose, returnTo }) {
  const box = useRef(null)
  const [closing, setClosing] = useState(false)

  const finish = useCallback(
    (then) => {
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      setClosing(true)
      setTimeout(() => {
        then()
        returnTo.current?.focus?.({ preventScroll: true })
      }, reduce ? 0 : 160)
    },
    [returnTo]
  )

  useEffect(() => {
    box.current?.querySelector('[aria-current="page"], button')?.focus({ preventScroll: true })
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  function onKeyDown(e) {
    if (e.key === 'Escape') {
      e.stopPropagation()
      finish(onClose)
      return
    }
    if (e.key !== 'Tab') return
    const list = box.current.querySelectorAll('button')
    const first = list[0]
    const last = list[list.length - 1]
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }

  return createPortal(
    <div
      className={`admin-sheet-backdrop ${closing ? 'is-closing' : ''}`}
      onMouseDown={(e) => e.target === e.currentTarget && finish(onClose)}
      onKeyDown={onKeyDown}
    >
      <div ref={box} className="admin-sheet" role="dialog" aria-modal="true" aria-labelledby="admin-more-title">
        <span className="admin-sheet-grab" aria-hidden="true" />
        <h2 id="admin-more-title" className="admin-sheet-title">More</h2>
        <ul className="admin-sheet-list">
          {items.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                className={`admin-sheet-row ${tab === t.id ? 'is-active' : ''}`}
                aria-current={tab === t.id ? 'page' : undefined}
                onClick={() => finish(() => onPick(t.id))}
              >
                <span className="admin-sheet-icon">
                  <t.Icon size={20} aria-hidden="true" />
                  {dirty.has(t.id) && <i className="admin-dirty-dot" />}
                </span>
                <span className="admin-sheet-text">
                  <strong>{t.label}</strong>
                  <span>{dirty.has(t.id) ? 'Unsaved changes' : t.blurb}</span>
                </span>
                <ChevronRight size={18} className="admin-sheet-chevron" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>,
    document.querySelector('.admin-page') || document.body
  )
}
