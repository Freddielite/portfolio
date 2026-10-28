import { useEffect, useRef } from 'react'
import HeroStage from './HeroStage.jsx'
import { CurtainLink } from '../context/CurtainContext.jsx'
import useTypewriter from '../hooks/useTypewriter.js'
import { useSiteSettings } from '../context/SiteSettingsContext.jsx'

const DEFAULT_ROLES = [
  'storefronts that convert',
  'APIs that hold up',
  'servers that stay online',
  'networks that stay secure',
]

function Word({ i, className = '', children }) {
  return (
    <span className="w">
      <span className={className} style={{ '--i': i }}>{children}</span>
    </span>
  )
}

export default function Hero() {
  const s = useSiteSettings()
  const roles = Array.isArray(s.heroRoles) && s.heroRoles.length ? s.heroRoles : DEFAULT_ROLES
  const role = useTypewriter(roles)

  const sectionRef = useRef(null)

  // Scroll handoff: --hp runs from 0 (top) to 1 (hero scrolled away). CSS uses
  // it to drift the headline and shrink the photo stage as you leave the hero.
  useEffect(() => {
    const el = sectionRef.current
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let raf = 0
    function update() {
      raf = 0
      const h = el.offsetHeight || 1
      const p = Math.min(1, Math.max(0, window.scrollY / (h * 0.9)))
      el.style.setProperty('--hp', p.toFixed(3))
    }
    function onScroll() {
      if (!raf) raf = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  const first = s.heroHeadlineLine1.split(' ')
  const highlight = s.heroHeadlineHighlight.split(' ')
  let n = 0

  return (
    <section id="top" className="hero" ref={sectionRef}>
      <div className="hero-copy">
        <span className="hero-badge">
          <span className="status-dot" /> {s.location}-based · {s.tagline}
        </span>
        <h1>
          <span className="hline">
            {first.map((w) => <Word key={`a${n}`} i={n++}>{w}</Word>)}
          </span>
          <span className="hline">
            <Word i={n++}>behind</Word>
            {highlight.map((w) => <Word key={`b${n}`} i={n++} className="text-glow">{w}</Word>)}
          </span>
        </h1>
        <p className="hero-role">
          Currently building <b>{role}</b><span className="caret" aria-hidden="true" />
        </p>
        <p className="hero-sub">{s.heroSub}</p>
        <div className="hero-actions">
          <CurtainLink to="/#contact" className="btn btn-primary mag">Start a project →</CurtainLink>
          <a href={s.githubUrl} target="_blank" rel="noreferrer" className="btn btn-ghost mag">GitHub ↗</a>
        </div>
      </div>
      <HeroStage />
    </section>
  )
}
