import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, CornerDownLeft, ArrowUpDown } from 'lucide-react'
import { useSiteSettings } from '../context/SiteSettingsContext.jsx'
import { useTheme } from '../context/ThemeContext.jsx'
import useContent from '../hooks/useContent.js'
import { getProjects, getPosts } from '../lib/content.js'
import fallbackProjects from '../data/projects.js'
import fallbackPosts from '../data/posts.js'
import { buildCommandItems } from '../lib/commandIndex.js'
import { fuzzySearch } from '../lib/fuzzyMatch.js'

// Order groups appear in when there's no query (or all match) — falls back
// to insertion order for anything not listed.
const GROUP_ORDER = ['Navigate', 'Projects', 'Blog', 'Actions', 'Elsewhere']

function groupItems(items) {
  const groups = new Map()
  for (const item of items) {
    if (!groups.has(item.group)) groups.set(item.group, [])
    groups.get(item.group).push(item)
  }
  return [...groups.entries()].sort(
    (a, b) => GROUP_ORDER.indexOf(a[0]) - GROUP_ORDER.indexOf(b[0])
  )
}

export default function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef(null)
  const navigate = useNavigate()
  const settings = useSiteSettings()
  const { toggleTheme } = useTheme()
  const [projects] = useContent(getProjects, fallbackProjects)
  const [posts] = useContent(getPosts, fallbackPosts)

  const allItems = useMemo(
    () => buildCommandItems({ settings, projects, posts }),
    [settings, projects, posts]
  )
  const filtered = useMemo(
    () => fuzzySearch(allItems, query.trim(), (item) => item.keywords || item.label),
    [allItems, query]
  )
  const grouped = useMemo(() => groupItems(filtered), [filtered])
  const flatFiltered = filtered // for index math across groups

  function close() {
    setOpen(false)
    setQuery('')
    setActiveIndex(0)
  }

  function runItem(item) {
    if (!item) return
    switch (item.kind) {
      case 'link':
        navigate(item.to)
        break
      case 'external':
        window.open(item.href, '_blank', 'noopener,noreferrer')
        break
      case 'toggle-theme':
        toggleTheme()
        break
      case 'download-cv': {
        const a = document.createElement('a')
        a.href = settings.resumeUrl
        a.download = `${settings.resumeFileName || settings.name || 'CV'}.pdf`
        a.click()
        break
      }
      case 'copy-email':
        navigator.clipboard?.writeText(settings.email).catch(() => {})
        break
      default:
        break
    }
    close()
  }

  // Global Cmd/Ctrl+K to open, Escape to close.
  useEffect(() => {
    function onKeyDown(e) {
      const isK = e.key === 'k' || e.key === 'K'
      if ((e.metaKey || e.ctrlKey) && isK) {
        e.preventDefault()
        setOpen((v) => !v)
      } else if (e.key === 'Escape' && open) {
        close()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open])

  // Also openable via a header button, which dispatches this event —
  // avoids threading open-state through Header via props/context.
  useEffect(() => {
    function onOpenRequest() {
      setOpen(true)
    }
    window.addEventListener('open-command-palette', onOpenRequest)
    return () => window.removeEventListener('open-command-palette', onOpenRequest)
  }, [])

  useEffect(() => {
    if (open) requestAnimationFrame(() => inputRef.current?.focus())
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  useEffect(() => {
    setActiveIndex(0)
  }, [query])

  function onKeyDownInInput(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, flatFiltered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      runItem(flatFiltered[activeIndex])
    }
  }

  if (!open) return null

  let runningIndex = -1

  return (
    <div className="command-palette-backdrop" onClick={close}>
      <div className="command-palette" onClick={(e) => e.stopPropagation()}>
        <div className="command-palette-input-row">
          <Search size={16} className="command-palette-search-icon" aria-hidden="true" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDownInInput}
            placeholder="Search pages, projects, posts…"
            aria-label="Command palette search"
          />
          <kbd className="command-palette-esc">Esc</kbd>
        </div>

        <div className="command-palette-results">
          {flatFiltered.length === 0 && <p className="command-palette-empty">No matches.</p>}

          {grouped.map(([group, items]) => (
            <div className="command-palette-group" key={group}>
              <div className="command-palette-group-label">{group}</div>
              {items.map((item) => {
                runningIndex += 1
                const isActive = runningIndex === activeIndex
                return (
                  <button
                    type="button"
                    key={item.id}
                    className={`command-palette-item ${isActive ? 'is-active' : ''}`}
                    onMouseEnter={() => setActiveIndex(runningIndex)}
                    onClick={() => runItem(item)}
                  >
                    <span className="command-palette-item-label">{item.label}</span>
                    {item.sublabel && <span className="command-palette-item-sub">{item.sublabel}</span>}
                  </button>
                )
              })}
            </div>
          ))}
        </div>

        <div className="command-palette-footer">
          <span><ArrowUpDown size={12} /> navigate</span>
          <span><CornerDownLeft size={12} /> select</span>
        </div>
      </div>
    </div>
  )
}
