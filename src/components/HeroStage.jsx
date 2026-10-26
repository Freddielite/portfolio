import { useEffect, useRef, useState } from 'react'
import { useSiteSettings } from '../context/SiteSettingsContext.jsx'
import { useTheme } from '../context/ThemeContext.jsx'

const CHIPS = [
  { t: 'React', style: { top: '9%', left: '5%' }, d: 1.2 },
  { t: 'Django', style: { top: '15%', right: '4%' }, d: 0.8 },
  { t: 'Security', style: { top: '62%', left: '2%' }, d: 1.5 },
  { t: 'Go', style: { bottom: '22%', right: '5%' }, d: 1 },
  { t: 'Linux', style: { top: '3%', right: '38%' }, d: 0.6 },
]

function NetworkCanvas() {
  const ref = useRef(null)
  const { theme } = useTheme()

  useEffect(() => {
    const cv = ref.current
    const host = cv.parentElement
    const cx = cv.getContext('2d')
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const css = getComputedStyle(document.documentElement)
    const a = css.getPropertyValue('--accent').trim() || '#3b5fe0'
    const n = css.getPropertyValue('--navy').trim() || '#223a8f'
    let W = 0
    let H = 0
    let pts = []
    let raf = 0
    let visible = true
    const m = { x: -999, y: -999 }

    function size() {
      const d = Math.min(window.devicePixelRatio || 1, 2)
      W = cv.clientWidth
      H = cv.clientHeight
      cv.width = W * d
      cv.height = H * d
      cx.setTransform(d, 0, 0, d, 0, 0)
      const count = Math.max(18, Math.round(W / 13))
      pts = Array.from({ length: count }, () => ({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
      }))
      draw()
    }

    function draw() {
      cx.clearRect(0, 0, W, H)
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i]
        if (!reduce) {
          p.x += p.vx
          p.y += p.vy
          const dx = m.x - p.x
          const dy = m.y - p.y
          if (Math.hypot(dx, dy) < 160) {
            p.x += dx * 0.015
            p.y += dy * 0.015
          }
          if (p.x < 0 || p.x > W) p.vx *= -1
          if (p.y < 0 || p.y > H) p.vy *= -1
        }
        for (let j = i + 1; j < pts.length; j++) {
          const q = pts[j]
          const e = Math.hypot(p.x - q.x, p.y - q.y)
          if (e < 100) {
            cx.strokeStyle = a
            cx.globalAlpha = (1 - e / 100) * 0.45
            cx.beginPath()
            cx.moveTo(p.x, p.y)
            cx.lineTo(q.x, q.y)
            cx.stroke()
          }
        }
        cx.globalAlpha = 1
        cx.fillStyle = Math.hypot(m.x - p.x, m.y - p.y) < 160 ? n : a
        cx.beginPath()
        cx.arc(p.x, p.y, 2.4, 0, 6.3)
        cx.fill()
      }
    }

    function loop() {
      if (visible && !document.hidden) draw()
      raf = requestAnimationFrame(loop)
    }

    function move(e) {
      const r = cv.getBoundingClientRect()
      m.x = e.clientX - r.left
      m.y = e.clientY - r.top
      host.style.setProperty('--px', (m.x / r.width - 0.5).toFixed(3))
      host.style.setProperty('--py', (m.y / r.height - 0.5).toFixed(3))
    }
    function leave() {
      m.x = m.y = -999
      host.style.setProperty('--px', 0)
      host.style.setProperty('--py', 0)
    }

    size()
    if (!reduce) raf = requestAnimationFrame(loop)
    const ro = new ResizeObserver(size)
    ro.observe(cv)
    const io = new IntersectionObserver(([en]) => { visible = en.isIntersecting })
    io.observe(cv)
    host.addEventListener('pointermove', move)
    host.addEventListener('pointerleave', leave)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      io.disconnect()
      host.removeEventListener('pointermove', move)
      host.removeEventListener('pointerleave', leave)
    }
  }, [theme])

  return <canvas ref={ref} className="net" aria-hidden="true" />
}

function LagosClock() {
  const [t, setT] = useState('')
  useEffect(() => {
    const f = new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Africa/Lagos',
    })
    const tick = () => setT(f.format(new Date()))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])
  return <span>{t ? `Lagos ${t} WAT` : 'Lagos'}</span>
}

export default function HeroStage() {
  const s = useSiteSettings()
  return (
    <div className="stage">
      <NetworkCanvas />
      <div className="ring" aria-hidden="true" />
      <div className="photo">
        <img src={s.photo} alt={s.name} />
      </div>
      {CHIPS.map((c) => (
        <div key={c.t} className="fc" style={{ ...c.style, '--d': c.d }} aria-hidden="true">{c.t}</div>
      ))}
      <div className="clock">
        <span className="status-dot" />
        <LagosClock />
      </div>
    </div>
  )
}
