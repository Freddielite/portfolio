import { useEffect, useRef, useState } from 'react'
import lqip from '../lib/lqip.json'

// Image that fades in from a tiny blurred placeholder. Images without a stored
// placeholder (for example new uploads from /admin) fade in from a soft shimmer.
export default function BlurImage({ src, alt = '', className = '' }) {
  const ref = useRef(null)
  const [loaded, setLoaded] = useState(false)
  const ph = lqip[src]

  useEffect(() => {
    setLoaded(false)
    const img = ref.current
    if (img && img.complete && img.naturalWidth > 0) setLoaded(true)
  }, [src])

  return (
    <span className={`bimg ${loaded ? 'loaded' : ''} ${className}`.trim()}>
      <span
        className={`bimg-ph ${ph ? '' : 'none'}`}
        style={ph ? { backgroundImage: `url(${ph})` } : undefined}
        aria-hidden="true"
      />
      <img ref={ref} src={src} alt={alt} loading="lazy" decoding="async" onLoad={() => setLoaded(true)} />
    </span>
  )
}
