import { useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'

// Everything in this file only runs in the installed app (opened from the home
// screen icon). In a normal browser tab the admin behaves exactly as before.
//
// To try app mode in a browser tab: localStorage.setItem('admin:app', '1'),
// then reload. Remove it to go back.
function detect() {
  if (typeof window === 'undefined') return false
  try {
    if (localStorage.getItem('admin:app') === '1') return true
  } catch {
    /* ignore */
  }
  if (window.Capacitor?.isNativePlatform?.()) return true // the Android app
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
}

export const IS_APP = detect()

const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
const canTransition = () => IS_APP && !!document.startViewTransition && !reduceMotion()

if (IS_APP && typeof document !== 'undefined') {
  document.documentElement.classList.add('admin-app')
  if (document.startViewTransition) document.documentElement.classList.add('admin-vt')
}

// ---------- 2. Sliding between screens ----------
// Runs `update` (which changes React state) inside a view transition, so the
// old screen slides out and the new one slides in from the side it comes
// from. dir: 'forward' | 'back'.
export function slide(dir, update) {
  if (!canTransition()) {
    update()
    return
  }
  const root = document.documentElement
  root.dataset.navDir = dir
  // The transition names are only set while sliding: kept on permanently they
  // would put the History window underneath the header.
  root.classList.add('admin-sliding')
  const t = document.startViewTransition(() => flushSync(update))
  // If another slide starts before this one finishes, the browser skips this
  // one (the screen still updates). That is expected, not an error.
  t.ready.catch(() => {})
  t.updateCallbackDone.catch(() => {})
  t.finished.finally(() => {
    delete root.dataset.navDir
    root.classList.remove('admin-sliding')
  })
}

// ---------- 1. Header that tucks away ----------
// Hides the header while you scroll down and brings it back as soon as you
// scroll up a little. Also says whether the big page title has scrolled under
// the header, so the header can show it instead.
export function useTuckingHeader(headerRef, titleRef, key) {
  const [tucked, setTucked] = useState(false)
  const [titleGone, setTitleGone] = useState(false)

  useEffect(() => {
    if (!IS_APP) return
    let last = window.scrollY
    let travel = 0
    let frame = 0
    const onScroll = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const y = Math.max(0, window.scrollY)
        const h = headerRef.current?.offsetHeight || 120
        const d = y - last
        last = y
        if (document.documentElement.classList.contains('admin-is-dragging')) return
        travel = Math.sign(d) === Math.sign(travel) ? travel + d : d
        if (y < h) setTucked(false)
        else if (travel > 12) setTucked(true)
        else if (travel < -8) setTucked(false)
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(frame)
    }
  }, [headerRef])

  // A focused field must never sit under the header.
  useEffect(() => {
    if (!IS_APP) return
    const onFocus = (e) => {
      if (e.target.matches?.('input, textarea, select')) setTucked(true)
    }
    document.addEventListener('focusin', onFocus)
    return () => document.removeEventListener('focusin', onFocus)
  }, [])

  useEffect(() => {
    if (!IS_APP || !titleRef.current) return
    const header = headerRef.current
    const io = new IntersectionObserver(([entry]) => setTitleGone(!entry.isIntersecting && entry.boundingClientRect.top < 80), {
      rootMargin: `-${(header?.offsetHeight || 110) - 40}px 0px 0px 0px`,
    })
    io.observe(titleRef.current)
    return () => io.disconnect()
  }, [headerRef, titleRef, key])

  // Tell sticky things (the post toolbar) how much room the header takes.
  useEffect(() => {
    if (!IS_APP) return
    const set = () => {
      const h = tucked ? 0 : headerRef.current?.offsetHeight || 0
      document.documentElement.style.setProperty('--a-header-now', `${h}px`)
    }
    set()
    const ro = new ResizeObserver(set)
    if (headerRef.current) ro.observe(headerRef.current)
    return () => ro.disconnect()
  }, [tucked, headerRef])

  return { tucked, titleGone, show: () => setTucked(false) }
}

// ---------- 4. Pull to refresh ----------
// Drag down from the very top of a page to reload it. `onRefresh` returns a
// promise; the spinner stays until it settles.
export function usePullToRefresh(onRefresh) {
  const [pull, setPull] = useState({ y: 0, state: 'idle' }) // idle | pulling | ready | refreshing
  const ref = useRef({ start: null, y: 0, busy: false })
  const cb = useRef(onRefresh)
  cb.current = onRefresh

  useEffect(() => {
    if (!IS_APP || !('ontouchstart' in window)) return
    const THRESHOLD = 72
    const s = ref.current

    const blocked = (target) =>
      s.busy ||
      window.scrollY > 0 ||
      document.querySelector('.admin-dialog-backdrop, .admin-modal-overlay') ||
      target.closest?.('.admin-side-nav, textarea, input[type="range"], .admin-grip, .builder-preview, .admin-paper')

    const start = (e) => {
      if (e.touches.length !== 1 || blocked(e.target)) return
      s.start = e.touches[0].clientY
      s.y = 0
    }
    const move = (e) => {
      if (s.start === null) return
      const dy = e.touches[0].clientY - s.start
      if (dy <= 0 || window.scrollY > 0) {
        if (s.y) setPull({ y: 0, state: 'idle' })
        s.start = dy <= 0 ? null : s.start
        s.y = 0
        return
      }
      e.preventDefault()
      // Resistance: the further you pull, the harder it gets.
      s.y = Math.min(130, dy * 0.5)
      setPull({ y: s.y, state: s.y >= THRESHOLD ? 'ready' : 'pulling' })
    }
    const end = async () => {
      if (s.start === null) return
      s.start = null
      if (s.y < THRESHOLD) {
        s.y = 0
        setPull({ y: 0, state: 'idle' })
        return
      }
      s.busy = true
      setPull({ y: 56, state: 'refreshing' })
      try {
        await cb.current?.()
      } finally {
        s.busy = false
        s.y = 0
        setPull({ y: 0, state: 'idle' })
      }
    }
    document.addEventListener('touchstart', start, { passive: true })
    document.addEventListener('touchmove', move, { passive: false })
    document.addEventListener('touchend', end)
    document.addEventListener('touchcancel', end)
    return () => {
      document.removeEventListener('touchstart', start)
      document.removeEventListener('touchmove', move)
      document.removeEventListener('touchend', end)
      document.removeEventListener('touchcancel', end)
    }
  }, [])

  return pull
}

// ---------- 3. Swipe back from the left edge ----------
// Drag from the left edge of the screen to go back, like a native app. The
// element follows your finger; let go past a third of the way (or flick) and
// `onBack` runs, otherwise it springs back.
export function useEdgeSwipeBack(elRef, enabled, onBack) {
  const cb = useRef(onBack)
  cb.current = onBack

  useEffect(() => {
    const el = elRef.current
    if (!IS_APP || !enabled || !el || !('ontouchstart' in window)) return
    const EDGE = 28
    let start = null

    const set = (x, animate) => {
      el.style.transition = animate ? 'transform 0.26s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.26s' : 'none'
      el.style.transform = x ? `translateX(${x}px)` : ''
      el.style.opacity = x ? String(Math.max(0.4, 1 - x / window.innerWidth)) : ''
    }

    const onStart = (e) => {
      const t = e.touches[0]
      if (e.touches.length !== 1 || t.clientX > EDGE) return
      if (document.querySelector('.admin-dialog-backdrop, .admin-modal-overlay')) return
      start = { x: t.clientX, y: t.clientY, time: Date.now(), dx: 0, locked: null }
    }
    const onMove = (e) => {
      if (!start) return
      const t = e.touches[0]
      const dx = t.clientX - start.x
      const dy = t.clientY - start.y
      if (start.locked === null && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) start.locked = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'
      if (start.locked !== 'x') return
      e.preventDefault()
      start.dx = Math.max(0, dx)
      set(start.dx, false)
    }
    const onEnd = () => {
      if (!start) return
      const { dx, time, locked } = start
      start = null
      if (locked !== 'x') return
      const fast = dx > 40 && dx / (Date.now() - time) > 0.5
      if (dx > window.innerWidth / 3 || fast) {
        set(window.innerWidth, true)
        setTimeout(() => {
          cb.current()
          set(0, false)
        }, 220)
      } else {
        set(0, true)
      }
    }
    document.addEventListener('touchstart', onStart, { passive: true })
    document.addEventListener('touchmove', onMove, { passive: false })
    document.addEventListener('touchend', onEnd)
    document.addEventListener('touchcancel', onEnd)
    return () => {
      document.removeEventListener('touchstart', onStart)
      document.removeEventListener('touchmove', onMove)
      document.removeEventListener('touchend', onEnd)
      document.removeEventListener('touchcancel', onEnd)
      set(0, false)
    }
  }, [elRef, enabled])
}

// ---------- 8. Badge on the app icon ----------
export function setBadge(count) {
  if (!IS_APP || !('setAppBadge' in navigator)) return
  ;(count ? navigator.setAppBadge(count) : navigator.clearAppBadge()).catch(() => {})
}
