import { useEffect, useState } from 'react'
import { useSiteSettings } from '../context/SiteSettingsContext.jsx'

export default function Terminal() {
  const s = useSiteSettings()
  const lines = [
    '$ whoami',
    `${s.shortName.toLowerCase()}, ${s.tagline.toLowerCase()}`,
    '$ status --all',
    'frontend ........ ok',
    'backend ......... ok',
    'security ........ ok',
    'uptime .......... online',
    '$ ship --client next',
  ]
  const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const [count, setCount] = useState(reduce ? lines.length : 0)

  useEffect(() => {
    if (reduce) return
    let i = 0
    let timer
    function tick() {
      if (i >= lines.length) {
        timer = setTimeout(() => { i = 0; setCount(0); tick() }, 2600)
        return
      }
      i += 1
      setCount(i)
      timer = setTimeout(tick, lines[i - 1].startsWith('$') ? 700 : 350)
    }
    timer = setTimeout(tick, 400)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="term" aria-hidden="true">
      <div className="term-bar">
        <i /><i /><i />
        <span>wilfred@wyntek ~</span>
      </div>
      <pre className="term-body">{lines.slice(0, count).join('\n')}</pre>
    </div>
  )
}
