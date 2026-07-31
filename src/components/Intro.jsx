import { useEffect, useRef, useState } from 'react'
import { Code2, User, Github } from 'lucide-react'

const FULL_NAME = 'Oseghale Wilfred'
const TYPE_SPEED = 65
const TYPE_START = 900
const FADE_START = 3400
const REMOVE_AT = 4200

export default function Intro() {
  const [visible, setVisible] = useState(true)
  const [fading, setFading] = useState(false)
  const [typed, setTyped] = useState('')
  const [showCursor, setShowCursor] = useState(true)
  const typingInterval = useRef(null)

  useEffect(() => {
    document.body.style.overflow = 'hidden'

    const typeStartTimer = setTimeout(() => {
      let i = 0
      typingInterval.current = setInterval(() => {
        i += 1
        setTyped(FULL_NAME.slice(0, i))
        if (i >= FULL_NAME.length) {
          clearInterval(typingInterval.current)
        }
      }, TYPE_SPEED)
    }, TYPE_START)

    const typeDoneAt = TYPE_START + FULL_NAME.length * TYPE_SPEED
    const cursorHideTimer = setTimeout(() => setShowCursor(false), typeDoneAt + 500)
    const fadeTimer = setTimeout(() => setFading(true), FADE_START)
    const removeTimer = setTimeout(() => {
      setVisible(false)
      document.body.style.overflow = ''
    }, REMOVE_AT)

    return () => {
      clearTimeout(typeStartTimer)
      clearTimeout(cursorHideTimer)
      clearTimeout(fadeTimer)
      clearTimeout(removeTimer)
      clearInterval(typingInterval.current)
      document.body.style.overflow = ''
    }
  }, [])

  if (!visible) return null

  return (
    <div className={`intro ${fading ? 'intro-fade' : ''}`} role="status" aria-label="Loading portfolio">
      <span className="sr-only">Hello, I'm Oseghale Wilfred. Welcome to my site.</span>

      <div className="intro-glow" aria-hidden="true" />

      <div className="intro-icons" aria-hidden="true">
        <a href="#work" className="intro-icon intro-icon-1" tabIndex={-1}>
          <Code2 size={20} />
        </a>
        <a href="#about" className="intro-icon intro-icon-2" tabIndex={-1}>
          <User size={20} />
        </a>
        <a
          href="https://github.com/Freddielite"
          target="_blank"
          rel="noreferrer"
          className="intro-icon intro-icon-3"
          tabIndex={-1}
        >
          <Github size={20} />
        </a>
      </div>

      <p className="intro-eyebrow" aria-hidden="true">Hello, I'm</p>

      <h1 className="intro-title" aria-hidden="true">
        <span className="name-strong intro-typed">
          {typed}
          <span className={`intro-cursor ${showCursor ? '' : 'intro-cursor-hidden'}`} />
        </span>
      </h1>

      <p className="intro-subtitle" aria-hidden="true">Welcome to my site.</p>
      <span className="intro-pill" aria-hidden="true">Wyntek Technologies</span>
    </div>
  )
}
