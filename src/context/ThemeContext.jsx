import { createContext, useContext, useEffect, useState } from 'react'
import { flushSync } from 'react-dom'

function getInitialTheme() {
  if (typeof window === 'undefined') return 'light'
  const stored = window.localStorage.getItem('theme')
  if (stored === 'light' || stored === 'dark') return stored
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

const ThemeContext = createContext({ theme: 'light', toggleTheme: () => {} })

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(getInitialTheme)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    window.localStorage.setItem('theme', theme)
  }, [theme])

  // `originEvent` is optional — pass the click event to animate the toggle
  // as a circular reveal from the button that was clicked (see ThemeToggle).
  // Callers without a click event (e.g. the command palette) just get an
  // instant switch, same as the reduced-motion fallback below.
  function toggleTheme(originEvent) {
    const next = theme === 'dark' ? 'light' : 'dark'
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (!document.startViewTransition || reduceMotion || !originEvent) {
      setTheme(next)
      return
    }

    const rect = originEvent.currentTarget.getBoundingClientRect()
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

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  return useContext(ThemeContext)
}
