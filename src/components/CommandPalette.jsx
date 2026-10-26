import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation } from 'react-router-dom'
import { Search } from 'lucide-react'
import { useCurtain } from '../context/CurtainContext.jsx'
import { useTheme } from '../context/ThemeContext.jsx'
import { useSiteSettings } from '../context/SiteSettingsContext.jsx'
import { getProjects, getPosts } from '../lib/content.js'

export default function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [sel, setSel] = useState(0)
  const inputRef = useRef(null)
  const listRef = useRef(null)
  const { go } = useCurtain()
  const { toggleTheme } = useTheme()
  const s = useSiteSettings()
  const { pathname } = useLocation()

  const items = useMemo(() => {
    const pages = [
      ['Home', '/', 'Page'],
      ['About', '/#about', 'Section'],
      ['Work', '/#work', 'Section'],
      ['Skills', '/#skills', 'Section'],
      ['Services', '/#services', 'Section'],
      ['Contact', '/#contact', 'Section'],
      ['Blog', '/blog', 'Page'],
    ].map(([label, to, kind]) => ({ label, kind, run: () => go(to) }))

    const projects = getProjects().map((p) => ({
      label: p.name,
      kind: 'Project',
      run: () => {
        if (pathname === '/') {
          go('/#work')
          setTimeout(() => window.dispatchEvent(new CustomEvent('project:open', { detail: p.id })), 450)
        } else {
          go('/#work')
          setTimeout(() => window.dispatchEvent(new CustomEvent('project:open', { detail: p.id })), 1900)
        }
      },
    }))
    const posts = getPosts().map((p) => ({
      label: p.title,
      kind: 'Post',
      run: () => go(`/blog/${p.slug}`),
    }))
    const actions = [
      { label: 'Toggle theme', kind: 'Action', run: () => toggleTheme() },
      { label: 'Email me', kind: 'Action', run: () => { window.location.href = `mailto:${s.email}` } },
      { label: 'Open GitHub', kind: 'Action', run: () => window.open(s.githubUrl, '_blank', 'noreferrer') },
    ]
    return [...pages, ...projects, ...posts, ...actions]
  }, [go, pathname, s, toggleTheme])

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    return term ? items.filter((i) => i.label.toLowerCase().includes(term)) : items
  }, [items, q])

  useEffect(() => {
    function onKey(e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((o) => !o)
      } else if (e.key === 'Escape') {
        setOpen(false)
      }
    }
    const onOpen = () => setOpen(true)
    window.addEventListener('keydown', onKey)
    window.addEventListener('palette:open', onOpen)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('palette:open', onOpen)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    setQ('')
    setSel(0)
    document.body.style.overflow = 'hidden'
    requestAnimationFrame(() => inputRef.current?.focus())
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  useEffect(() => setSel(0), [q])

  useEffect(() => {
    listRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [sel])

  if (!open) return null

  function choose(item) {
    setOpen(false)
    item.run()
  }

  function onKeyDown(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSel((i) => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSel((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && filtered[sel]) {
      e.preventDefault()
      choose(filtered[sel])
    }
  }

  return createPortal(
    <div className="palette-overlay" onClick={(e) => { if (e.target === e.currentTarget) setOpen(false) }}>
      <div className="palette" role="dialog" aria-modal="true" aria-label="Command palette">
        <div className="palette-input">
          <Search size={17} aria-hidden="true" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Jump to a section, project or post"
            aria-label="Search"
            role="combobox"
            aria-expanded="true"
            aria-controls="palette-list"
          />
        </div>
        <ul id="palette-list" role="listbox" ref={listRef}>
          {filtered.length === 0 && <li className="palette-empty">No match. Try another word.</li>}
          {filtered.map((item, i) => (
            <li
              key={`${item.kind}-${item.label}`}
              role="option"
              aria-selected={i === sel}
              className={i === sel ? 'sel' : ''}
              onMouseEnter={() => setSel(i)}
              onClick={() => choose(item)}
            >
              <span>{item.label}</span>
              <span className="mono-label">{item.kind}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>,
    document.body
  )
}
