import { useEffect, useState } from 'react'

// Makes /admin installable as its own app ("Add to Home Screen") without
// touching the public site: the manifest, icons and service worker are only
// added to the page while the admin is open.

// Chrome and Edge announce that the app can be installed with this event. It can
// fire early, so listen from the moment this module loads.
let deferred = null
const listeners = new Set()
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferred = e
    listeners.forEach((fn) => fn(true))
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    listeners.forEach((fn) => fn(false))
  })
}

export const isStandalone = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true)

// Returns an install function while the browser offers installing, else null.
export function useInstallPrompt() {
  const [available, setAvailable] = useState(!!deferred)
  useEffect(() => {
    listeners.add(setAvailable)
    return () => listeners.delete(setAvailable)
  }, [])
  if (!available || isStandalone()) return null
  return async () => {
    const e = deferred
    if (!e) return
    deferred = null
    setAvailable(false)
    e.prompt()
    await e.userChoice.catch(() => null)
  }
}

function addTag(tag, attrs) {
  const el = document.createElement(tag)
  Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v))
  el.dataset.adminPwa = ''
  document.head.appendChild(el)
  return el
}

// Call once from the admin page.
export function useAdminApp() {
  useEffect(() => {
    const viewport = document.querySelector('meta[name="viewport"]')
    const oldViewport = viewport?.getAttribute('content')
    // Lets the installed app draw under the phone's status bar; the admin's
    // CSS keeps content clear of it with safe-area padding.
    viewport?.setAttribute('content', 'width=device-width, initial-scale=1, viewport-fit=cover')

    addTag('link', { rel: 'manifest', href: '/admin.webmanifest' })
    addTag('link', { rel: 'apple-touch-icon', href: '/admin-icons/apple-touch-icon.png' })
    addTag('meta', { name: 'apple-mobile-web-app-capable', content: 'yes' })
    addTag('meta', { name: 'mobile-web-app-capable', content: 'yes' })
    addTag('meta', { name: 'apple-mobile-web-app-title', content: 'Admin' })
    addTag('meta', { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' })
    const theme = addTag('meta', { name: 'theme-color', content: '#0b1020' })

    // Match the browser bar to the admin background in either theme.
    const sync = () => {
      const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim()
      if (bg) theme.setAttribute('content', bg)
    }
    sync()
    const obs = new MutationObserver(sync)
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })

    if ('serviceWorker' in navigator && window.isSecureContext) {
      navigator.serviceWorker.register('/admin-sw.js', { scope: '/admin' }).catch(() => {})
    }

    return () => {
      obs.disconnect()
      document.querySelectorAll('[data-admin-pwa]').forEach((el) => el.remove())
      if (viewport && oldViewport) viewport.setAttribute('content', oldViewport)
    }
  }, [])
}
