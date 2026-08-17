import { Sun, Moon } from 'lucide-react'
import { useTheme } from '../context/ThemeContext.jsx'

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={(e) => toggleTheme(e)}
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
