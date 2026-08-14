import { useEffect, useState } from 'react'
import { flushSync } from 'react-dom'
import { Sun, Moon } from 'lucide-react'

function getInitialTheme() {
  if (typeof window === 'undefined') return 'light'
  const stored = window.localStorage.getItem('theme')
  if (stored === 'light' || stored === 'dark') return stored
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState(getInitialTheme)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    window.localStorage.setItem('theme', theme)
  }, [theme])

  function handleClick(e) {
    const next = theme === 'dark' ? 'light' : 'dark'
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    // Falls back to an instant switch on browsers without the View
    // Transitions API (Firefox, older Safari) or when motion is reduced.
    if (!document.startViewTransition || reduceMotion) {
      setTheme(next)
      return
    }

    const rect = e.currentTarget.getBoundingClientRect()
    const x = rect.left + rect.width / 2
    const y = rect.top + rect.height / 2
    const endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    )

    document.documentElement.style.setProperty('--theme-toggle-x', `${x}px`)
    document.documentElement.style.setProperty('--theme-toggle-y', `${y}px`)
    document.documentElement.style.setProperty('--theme-toggle-radius', `${endRadius}px`)

    document.startViewTransition(() => {
      flushSync(() => setTheme(next))
    })
  }

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={handleClick}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <span className={`theme-toggle-icon ${theme === 'dark' ? 'is-dark' : 'is-light'}`}>
        <Sun size={17} className="theme-toggle-sun" />
        <Moon size={17} className="theme-toggle-moon" />
      </span>
    </button>
  )
}
