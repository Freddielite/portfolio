import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

const CurtainContext = createContext({ go: () => {} })
export const useCurtain = () => useContext(CurtainContext)

const SECTION_LABELS = {
  top: 'Home',
  about: 'About',
  skills: 'Skills',
  work: 'Work',
  services: 'Services',
  contact: 'Contact',
}

function labelFor(url) {
  if (url.pathname.startsWith('/blog')) return 'Blog'
  const id = url.hash.replace('#', '')
  return SECTION_LABELS[id] || 'Home'
}

const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

export function CurtainProvider({ children }) {
  const navigate = useNavigate()
  const location = useLocation()
  const here = useRef(location)
  here.current = location
  const timers = useRef([])
  const active = useRef(false)
  const [view, setView] = useState({ on: false, cover: false, label: '' })

  const after = (ms, fn) => timers.current.push(setTimeout(fn, ms))

  const go = useCallback(
    (to, label) => {
      const url = new URL(to, window.location.origin)
      const samePage = url.pathname === here.current.pathname

      if (samePage) {
        // Same page: smooth-scroll to the section instead of a full transition.
        const el = url.hash ? document.querySelector(url.hash) : null
        if (el) {
          el.scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth' })
          window.history.replaceState(null, '', `${url.pathname}${url.hash}`)
        } else {
          window.scrollTo({ top: 0, behavior: reduceMotion() ? 'auto' : 'smooth' })
          window.history.replaceState(null, '', url.pathname)
        }
        return
      }

      if (reduceMotion()) {
        navigate(to)
        return
      }

      timers.current.forEach(clearTimeout)
      timers.current = []
      active.current = true
      setView({ on: true, cover: false, label: label || labelFor(url) })
      requestAnimationFrame(() =>
        requestAnimationFrame(() => setView((v) => ({ ...v, cover: true })))
      )
      after(750, () => navigate(to))
      after(1300, () => setView((v) => ({ ...v, cover: false })))
      after(2000, () => {
        active.current = false
        setView((v) => ({ ...v, on: false }))
      })
    },
    [navigate]
  )

  // After any navigation: jump to the hash target, or to the top of the new page.
  useEffect(() => {
    const instant = active.current || reduceMotion()
    if (location.hash) {
      const el = document.querySelector(location.hash)
      if (el) {
        requestAnimationFrame(() => el.scrollIntoView({ behavior: instant ? 'auto' : 'smooth' }))
        return
      }
    }
    window.scrollTo(0, 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, location.hash])

  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  return (
    <CurtainContext.Provider value={{ go }}>
      {children}
      <div
        className={`pt ${view.on ? 'on' : ''} ${view.cover ? 'cover' : ''}`}
        aria-hidden="true"
      >
        <div className="pp t" />
        <div className="pp b" />
        <div className="pl">
          <span>{view.label}</span>
        </div>
      </div>
    </CurtainContext.Provider>
  )
}

// A real <a href> (good for crawlers and "open in new tab") that plays the
// curtain transition on normal clicks.
export function CurtainLink({ to, label, onClick, children, ...rest }) {
  const { go } = useCurtain()
  return (
    <a
      href={to}
      {...rest}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
        e.preventDefault()
        if (onClick) onClick(e)
        go(to, label)
      }}
    >
      {children}
    </a>
  )
}
