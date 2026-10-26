import { useEffect } from 'react'

const fine = () =>
  window.matchMedia('(hover: hover) and (pointer: fine)').matches &&
  !window.matchMedia('(prefers-reduced-motion: reduce)').matches

// Spotlight + 3D tilt for cards. Wire up with onPointerMove / onPointerLeave.
export function cardMove(e) {
  if (!fine()) return
  const el = e.currentTarget
  const r = el.getBoundingClientRect()
  const x = (e.clientX - r.left) / r.width - 0.5
  const y = (e.clientY - r.top) / r.height - 0.5
  el.style.setProperty('--mx', `${e.clientX - r.left}px`)
  el.style.setProperty('--my', `${e.clientY - r.top}px`)
  el.style.setProperty('--ry', `${x * 8}deg`)
  el.style.setProperty('--rx', `${-y * 8}deg`)
}

export function cardLeave(e) {
  const el = e.currentTarget
  el.style.setProperty('--ry', '0deg')
  el.style.setProperty('--rx', '0deg')
}

// Spotlight only (no tilt), for flat cards.
export function glowMove(e) {
  if (!fine()) return
  const el = e.currentTarget
  const r = el.getBoundingClientRect()
  el.style.setProperty('--mx', `${e.clientX - r.left}px`)
  el.style.setProperty('--my', `${e.clientY - r.top}px`)
}

// Magnetic buttons: any element with the .mag class nudges toward the cursor.
export function useMagnetic() {
  useEffect(() => {
    if (!fine()) return
    function move(e) {
      const el = e.target.closest?.('.mag')
      if (!el) return
      const r = el.getBoundingClientRect()
      el.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.22}px, ${(e.clientY - r.top - r.height / 2) * 0.3}px)`
    }
    function leave(e) {
      const el = e.target.closest?.('.mag')
      if (el) el.style.transform = ''
    }
    document.addEventListener('pointermove', move)
    document.addEventListener('pointerout', leave)
    return () => {
      document.removeEventListener('pointermove', move)
      document.removeEventListener('pointerout', leave)
    }
  }, [])
}
