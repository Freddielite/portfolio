import { useEffect, useState } from 'react'

export default function useTypewriter(words, { type = 60, del = 30, hold = 1500 } = {}) {
  const [text, setText] = useState(words[0] || '')

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setText(words[0] || '')
      return
    }
    let i = 0
    let c = 0
    let deleting = false
    let timer
    function tick() {
      const w = words[i]
      c += deleting ? -1 : 1
      setText(w.slice(0, c))
      let ms = deleting ? del : type
      if (!deleting && c === w.length) {
        deleting = true
        ms = hold
      } else if (deleting && c === 0) {
        deleting = false
        i = (i + 1) % words.length
        ms = 300
      }
      timer = setTimeout(tick, ms)
    }
    setText('')
    timer = setTimeout(tick, 900)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return text
}
