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

// ---------- 2b. Switching sections on phones ----------
// The section (its title and its panel, wrapped in .admin-screen) leaves toward
// one side and fades, the new one comes in from the other side. Only transform
// and opacity change, which the phone's graphics chip animates by itself, so it
// stays smooth even while the new section is still loading. (The browser's own
// page transition photographs the whole long page first, which made phones drop
// frames.) `update` swaps the content while the screen is invisible.
// dir: 'forward' (to a section further right in the tab bar) | 'back'.
// fromX: where a swipe left the screen, so it carries on from under the finger.
let switching = null

export function switchScreen(el, dir, update, { fromX = 0, swiped = false } = {}) {
  switching?.finishNow()
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (!el || !el.animate || reduce) {
    if (el) {
      el.style.transform = ''
      el.style.opacity = ''
    }
    update()
    return
  }
  const sign = dir === 'forward' ? -1 : 1 // the side the old screen leaves toward
  const w = el.offsetWidth || window.innerWidth
  const fromOpacity = swiped ? Math.max(0.5, 1 - Math.abs(fromX) / w) : 1
  const outTo = swiped ? sign * Math.max(w * 0.45, Math.abs(fromX) + 60) : sign * 56
  el.style.transform = ''
  el.style.opacity = ''
  const job = { done: false, out: null, inn: null }
  const swap = () => {
    if (job.done) return
    job.done = true
    update()
    job.out?.cancel()
    job.inn = el.animate(
      [{ transform: `translateX(${-sign * (swiped ? 72 : 56)}px)`, opacity: 0 }, { transform: 'translateX(0)', opacity: 1 }],
      { duration: 260, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' }
    )
    job.inn.onfinish = () => {
      if (switching === job) switching = null
    }
  }
  job.finishNow = () => {
    swap()
    job.inn?.finish()
  }
  job.out = el.animate(
    [{ transform: `translateX(${fromX}px)`, opacity: fromOpacity }, { transform: `translateX(${outTo}px)`, opacity: 0 }],
    { duration: swiped ? 140 : 110, easing: 'cubic-bezier(0.4, 0, 1, 1)', fill: 'forwards' }
  )
  job.out.onfinish = swap
  switching = job
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
      document.querySelector('.admin-dialog-backdrop, .admin-modal-overlay, .admin-sheet-backdrop, .admin-cropper-backdrop') ||
      document.documentElement.classList.contains('admin-swiping') ||
      target.closest?.('.admin-side-nav, .admin-tabbar, .admin-sheet-backdrop, textarea, input[type="range"], .admin-grip, .builder-preview, .admin-paper')

    const start = (e) => {
      if (e.touches.length !== 1 || blocked(e.target)) return
      s.start = e.touches[0].clientY
      s.startX = e.touches[0].clientX
      s.y = 0
    }
    const move = (e) => {
      if (s.start === null) return
      const dy = e.touches[0].clientY - s.start
      // A sideways swipe (switching sections) is not a pull.
      if (!s.y && Math.abs(e.touches[0].clientX - s.startX) > Math.abs(dy)) {
        s.start = null
        return
      }
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
      if (document.querySelector('.admin-dialog-backdrop, .admin-modal-overlay, .admin-sheet-backdrop, .admin-cropper-backdrop')) return
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

// ---------- 9. Swipe between sections (phones, browser and app) ----------
// Swipe left or right on Overview, Posts, Projects or Subscribers to move to
// the next or previous one, in the same order as the tab bar. It stays out of
// the way of everything else that uses a sideways drag: it never starts on a
// field, a drag handle, the post editor, anything that scrolls sideways, or
// within 24px of the screen edges (Android's back gesture lives there).
const NO_SWIPE = [
  'input', 'textarea', 'select', 'button[role="slider"]', '[contenteditable="true"]', '[data-no-swipe]',
  '.admin-grip', '.admin-tabbar', '.admin-sidebar', '.admin-dock', '.admin-toast-wrap', '.admin-cropper',
  '.blk-editor', '.builder-preview', '.admin-paper', 'video', 'canvas',
].join(', ')
const OPEN_OVERLAY = '.admin-dialog-backdrop, .admin-modal-overlay, .admin-sheet-backdrop, .admin-cropper-backdrop, .admin-lock'

function scrollsSideways(el) {
  for (let n = el; n && n !== document.body; n = n.parentElement) {
    if (n.scrollWidth > n.clientWidth + 2) {
      const ox = getComputedStyle(n).overflowX
      if (ox === 'auto' || ox === 'scroll') return true
    }
  }
  return false
}

export function useTabSwipe({ tab, order, go }) {
  const cur = useRef({ tab, order, go })
  cur.current = { tab, order, go }

  useEffect(() => {
    if (typeof window === 'undefined' || !('ontouchstart' in window)) return
    const phone = window.matchMedia('(max-width: 860px)')
    const root = document.documentElement
    const EDGE = 24
    let g = null
    let frame = 0

    const next = (dir) => {
      const { tab: t, order: o } = cur.current
      const i = o.indexOf(t)
      return i < 0 ? null : o[i + dir] || null
    }
    // One write per frame, transform and opacity only.
    const paint = (el, x) => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        el.style.transform = x ? `translateX(${x}px)` : ''
        el.style.opacity = x ? String(Math.max(0.5, 1 - Math.abs(x) / el.offsetWidth)) : ''
      })
    }
    const settle = (el, x) => {
      cancelAnimationFrame(frame)
      el.style.transform = ''
      el.style.opacity = ''
      if (!x || !el.animate) return
      el.animate(
        [{ transform: `translateX(${x}px)`, opacity: Math.max(0.5, 1 - Math.abs(x) / el.offsetWidth) }, { transform: 'translateX(0)', opacity: 1 }],
        { duration: 220, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' }
      )
    }

    const onStart = (e) => {
      g = null
      if (!phone.matches || e.touches.length !== 1) return
      const t = e.touches[0]
      if (t.clientX < EDGE || t.clientX > window.innerWidth - EDGE) return
      if (!cur.current.order.includes(cur.current.tab)) return
      if (root.classList.contains('admin-is-dragging') || document.querySelector(OPEN_OVERLAY)) return
      const screen = document.querySelector('.admin-screen')
      const panel = document.querySelector('.admin-panel:not([hidden])')
      if (!screen || !panel || panel.querySelector('.builder.is-editing')) return
      if (e.target.closest?.(NO_SWIPE) || scrollsSideways(e.target)) return
      g = { x: t.clientX, y: t.clientY, last: t.clientX, time: Date.now(), shown: 0, lock: null, screen }
    }

    const onMove = (e) => {
      if (!g) return
      const t = e.touches[0]
      // A finger cannot cross 40% of the screen between two touch events: a
      // jump like that is a stray point, and following it would flash the screen.
      if (Math.abs(t.clientX - g.last) > window.innerWidth * 0.4) return
      g.last = t.clientX
      const dx = t.clientX - g.x
      const dy = t.clientY - g.y
      if (g.lock === null) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) < 10) return
        g.lock = Math.abs(dx) > Math.abs(dy) * 1.3 ? 'x' : 'y'
        if (g.lock === 'y') {
          g = null
          return
        }
        root.classList.add('admin-swiping')
        g.x = t.clientX // start following from here, so the screen does not jump by 10px
        return
      }
      e.preventDefault()
      const d = t.clientX - g.x
      // Follows the finger; stiff where there is no next section.
      g.shown = next(d < 0 ? 1 : -1) ? d : d * 0.15
      paint(g.screen, g.shown)
    }

    const onEnd = () => {
      if (!g) return
      const { shown, time, lock, screen } = g
      g = null
      root.classList.remove('admin-swiping')
      if (lock !== 'x') return
      const target = next(shown < 0 ? 1 : -1)
      const fast = Math.abs(shown) > 40 && Math.abs(shown) / Math.max(1, Date.now() - time) > 0.45
      if (target && (Math.abs(shown) > Math.min(110, window.innerWidth * 0.28) || fast)) {
        cancelAnimationFrame(frame)
        // The switch carries on from where the finger left the screen.
        cur.current.go(target, undefined, { fromX: shown, swiped: true })
      } else {
        settle(screen, shown)
      }
    }

    document.addEventListener('touchstart', onStart, { passive: true })
    document.addEventListener('touchmove', onMove, { passive: false })
    document.addEventListener('touchend', onEnd)
    document.addEventListener('touchcancel', onEnd)
    return () => {
      cancelAnimationFrame(frame)
      document.removeEventListener('touchstart', onStart)
      document.removeEventListener('touchmove', onMove)
      document.removeEventListener('touchend', onEnd)
      document.removeEventListener('touchcancel', onEnd)
      root.classList.remove('admin-swiping')
    }
  }, [])
}

// ---------- 10. Keyboard open (phones) ----------
// While you type, the tab bar steps aside so the keyboard and the field get
// the room (html.admin-kb-open, see admin.css). Focusing a text field hides it
// straight away; after that the screen height decides, so closing the keyboard
// with the phone's Back (which leaves the field focused) brings the bar back.
export function useKeyboardClass() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('ontouchstart' in window)) return
    const root = document.documentElement
    const vv = window.visualViewport
    const isField = (el) =>
      !!el?.matches?.(
        'textarea, [contenteditable="true"], input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="file"]):not([type="button"]):not([type="submit"]):not([type="color"])'
      )
    const height = () => Math.min(window.innerHeight, vv ? vv.height : Infinity)
    let tallest = height()
    let width = window.innerWidth
    let focusedAt = 0
    let t = 0
    const set = (on) => root.classList.toggle('admin-kb-open', on)

    const onResize = () => {
      if (window.innerWidth !== width) {
        width = window.innerWidth // turned the phone: start measuring again
        tallest = 0
      }
      const h = height()
      tallest = Math.max(tallest, h)
      if (!isField(document.activeElement)) return set(false)
      if (h < tallest * 0.8) set(true)
      else if (Date.now() - focusedAt > 800) set(false) // keyboard closed, field still focused
    }
    const onIn = (e) => {
      if (!isField(e.target)) return
      clearTimeout(t)
      focusedAt = Date.now()
      set(true)
    }
    const onOut = () => {
      clearTimeout(t)
      t = setTimeout(() => {
        if (!isField(document.activeElement)) set(false)
      }, 120)
    }
    document.addEventListener('focusin', onIn)
    document.addEventListener('focusout', onOut)
    window.addEventListener('resize', onResize)
    vv?.addEventListener('resize', onResize)
    return () => {
      clearTimeout(t)
      document.removeEventListener('focusin', onIn)
      document.removeEventListener('focusout', onOut)
      window.removeEventListener('resize', onResize)
      vv?.removeEventListener('resize', onResize)
      set(false)
    }
  }, [])
}
