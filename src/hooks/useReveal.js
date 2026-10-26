import { useEffect, useRef, useState } from 'react'

// One-way reveal: flips to true the first time the element scrolls into view
// and stays true, so sections animate in once instead of replaying.
export default function useReveal(threshold = 0.15) {
  const ref = useRef(null)
  const [on, setOn] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node) return
    if (!('IntersectionObserver' in window)) {
      setOn(true)
      return
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setOn(true)
          io.disconnect()
        }
      },
      { threshold, rootMargin: '0px 0px -6% 0px' }
    )
    io.observe(node)
    return () => io.disconnect()
  }, [threshold])

  return [ref, on]
}
