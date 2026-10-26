import { useEffect, useRef } from 'react'
import { useSiteSettings } from '../context/SiteSettingsContext.jsx'

const DURATION = 2800

// Cinematic first-load intro: a photo ring draws itself, the name rises in
// letter by letter, a counter runs to 100, then the screen splits open.
export default function Intro({ onDone }) {
  const s = useSiteSettings()
  const root = useRef(null)
  const count = useRef(null)
  const finished = useRef(false)

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const el = root.current
    document.body.style.overflow = 'hidden'
    let raf
    let t1
    let t2
    const t0 = performance.now()
    const total = reduce ? 200 : DURATION

    function finish() {
      if (finished.current) return
      finished.current = true
      cancelAnimationFrame(raf)
      el.classList.add('out')
      t1 = setTimeout(() => document.documentElement.classList.add('is-ready'), reduce ? 0 : 500)
      t2 = setTimeout(() => {
        document.body.style.overflow = ''
        onDone()
      }, reduce ? 0 : 1200)
    }
    el._finish = finish

    function frame(now) {
      const p = Math.min(1, (now - t0) / total)
      const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2
      el.style.setProperty('--p', e)
      if (count.current) count.current.textContent = Math.round(e * 100)
      if (p < 1) raf = requestAnimationFrame(frame)
      else t1 = setTimeout(finish, 250)
    }
    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(t1)
      clearTimeout(t2)
      document.body.style.overflow = ''
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      ref={root}
      className="intro play"
      role="status"
      aria-label="Loading portfolio"
      onClick={() => root.current?._finish?.()}
    >
      <div className="ip t" />
      <div className="ip b" />
      <div className="ic">
        <div className="ia">
          <svg viewBox="0 0 200 200" aria-hidden="true">
            <circle className="c0" cx="100" cy="100" r="92" />
            <circle className="c1" cx="100" cy="100" r="92" />
          </svg>
          <div className="pw">
            <img src={s.photo} alt="" />
          </div>
        </div>
        <div className="in" aria-hidden="true">
          {s.name.split('').map((c, i) => (
            <span key={i} style={{ '--i': i }}>{c === ' ' ? '\u00a0' : c}</span>
          ))}
        </div>
        <div className="isub">{s.tagline} · {s.company}</div>
        <div className="ibr"><i /></div>
        <div className="cnt"><span ref={count}>0</span>%</div>
        <span className="sr-only">Loading. Click to skip.</span>
      </div>
    </div>
  )
}
