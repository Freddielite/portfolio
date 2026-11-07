import { useEffect, useState } from 'react'
import AdminLogin from '../admin/AdminLogin.jsx'
import AdminDashboard from '../admin/AdminDashboard.jsx'
import ReauthPrompt from '../admin/ReauthPrompt.jsx'
import LockScreen from '../admin/LockScreen.jsx'
import { checkSession } from '../admin/http.js'
import { useAdminApp } from '../admin/pwa.js'
import SEO from '../components/SEO.jsx'
import '../admin/admin.css'

export default function Admin() {
  const [status, setStatus] = useState('checking') // checking | out | locked | in
  useAdminApp()

  useEffect(() => {
    fetch('/api/admin/me', { cache: 'no-store' })
      .then(async (res) => {
        if (res.ok) return setStatus('in')
        const body = await res.json().catch(() => ({}))
        setStatus(body.locked ? 'locked' : 'out')
      })
      .catch(() => setStatus('out'))
  }, [])

  // Coming back to the admin after a while (app switched away, phone locked):
  // ask the server again, so the lock screen covers everything straight away
  // instead of waiting for the next save.
  useEffect(() => {
    if (status !== 'in') return
    let hiddenAt = null
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') hiddenAt = Date.now()
      else if (hiddenAt && Date.now() - hiddenAt > 30 * 1000) checkSession()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [status])

  async function handleLogout() {
    try {
      await fetch('/api/admin/logout', { method: 'POST' })
    } finally {
      setStatus('out')
    }
  }

  return (
    <div className="admin-page">
      <SEO title="Admin" path="/admin" noIndex />
      {status === 'checking' && <p className="admin-hint admin-loading-screen">Loading…</p>}
      {status === 'out' && <AdminLogin onLogin={() => setStatus('in')} />}
      {status === 'locked' && <LockScreen onUnlocked={() => setStatus('in')} onLogout={handleLogout} />}
      {status === 'in' && (
        <>
          <AdminDashboard onLogout={handleLogout} />
          <ReauthPrompt onLogout={handleLogout} />
        </>
      )}
    </div>
  )
}
