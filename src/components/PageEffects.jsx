import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { useMagnetic } from '../hooks/usePointerFx.js'

// Which background tint each section gets as you scroll through the home page.
const TINTS = {
  about: 'about', skills: 'about', work: 'work', services: 'services', process: 'services',
  journal: 'work', testimonials: 'about', contact: 'contact',
}

// Scroll progress bar, pointer-following glow and magnetic buttons.
export default function PageEffects() {
  const bar = useRef(null)
  const orb = useRef(null)
  useMagnetic()
  const { pathname } = useLocation()

  useEffect(() => {
    const root = document.documentElement
    if (pathname !== '/') {
      delete root.dataset.tint
      return
    }
    const nodes = ['top', ...Object.keys(TINTS)].map((id) => document.getElementById(id)).filter(Boolean)
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (!en.isIntersecting) return
          const tint = TINTS[en.target.id]
          if (tint) root.dataset.tint = tint
          else delete root.dataset.tint
        })
      },
      { rootMargin: '-45% 0px -50% 0px' }
    )
    nodes.forEach((n) => io.observe(n))
    return () => {
      io.disconnect()
      delete root.dataset.tint
    }
  }, [pathname])

  useEffect(() => {
    let raf = 0
    function onScroll() {
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        const max = document.documentElement.scrollHeight - window.innerHeight
        if (bar.current) bar.current.style.transform = `scaleX(${max > 0 ? window.scrollY / max : 0})`
      })
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)

    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches
    function onMove(e) {
      if (!orb.current) return
      orb.current.style.setProperty('--ox', `${e.clientX - 260}px`)
      orb.current.style.setProperty('--oy', `${e.clientY - 260}px`)
    }
    if (fine) window.addEventListener('pointermove', onMove, { passive: true })

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      window.removeEventListener('pointermove', onMove)
    }
  }, [])

  return (
    <>
      <div className="scroll-progress" ref={bar} aria-hidden="true" />
      <div className="tint" aria-hidden="true" />
      <div className="orb" ref={orb} aria-hidden="true" />
    </>
  )
}
