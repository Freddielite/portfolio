import { useEffect, useRef } from 'react'

// Desktop-only cursor follower. Grows over interactive elements and shows a
// label ("View", "Read") where an element sets data-cursor.
export default function CustomCursor() {
  const el = useRef(null)
  const label = useRef(null)

  useEffect(() => {
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!fine || reduce) return
    const node = el.current
    document.documentElement.classList.add('has-cursor')
    let x = 0
    let y = 0
    let tx = 0
    let ty = 0
    let raf

    function move(e) {
      tx = e.clientX
      ty = e.clientY
      node.style.opacity = 1
    }
    function over(e) {
      const t = e.target.closest?.('a, button, .project-card, input, textarea, select, summary, [role="tab"], [role="option"]')
      const tag = e.target.closest?.('[data-cursor]')?.dataset.cursor || ''
      node.classList.toggle('big', !!t)
      node.classList.toggle('lab', !!tag)
      label.current.textContent = tag
    }
    const hide = () => { node.style.opacity = 0 }
    function loop() {
      x += (tx - x) * 0.2
      y += (ty - y) * 0.2
      node.style.transform = `translate(${x}px, ${y}px)`
      raf = requestAnimationFrame(loop)
    }
    loop()
    window.addEventListener('pointermove', move)
    document.addEventListener('pointerover', over)
    document.documentElement.addEventListener('mouseleave', hide)
    window.addEventListener('blur', hide)
    return () => {
      cancelAnimationFrame(raf)
      document.documentElement.classList.remove('has-cursor')
      window.removeEventListener('pointermove', move)
      document.removeEventListener('pointerover', over)
      document.documentElement.removeEventListener('mouseleave', hide)
      window.removeEventListener('blur', hide)
    }
  }, [])

  return (
    <div className="cur" ref={el} aria-hidden="true">
      <span ref={label} />
    </div>
  )
}
