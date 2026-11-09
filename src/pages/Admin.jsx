import { useCallback, useEffect, useRef, useState } from 'react'
import { RefreshCw, WifiOff } from 'lucide-react'
import AdminLogin from '../admin/AdminLogin.jsx'
import AdminDashboard from '../admin/AdminDashboard.jsx'
import ReauthPrompt from '../admin/ReauthPrompt.jsx'
import LockScreen from '../admin/LockScreen.jsx'
import { checkSession, reauthCancelled } from '../admin/http.js'
import { reportNetwork } from '../admin/network.js'
import { canOpenFromCache, clearCache, rememberSession } from '../admin/cache.js'
import { useAdminApp } from '../admin/pwa.js'
import { confirmLockShown, lockAtLaunch } from '../admin/nativeLock.js'
import { isNative, thisDeviceId } from '../admin/native.js'
import SEO from '../components/SEO.jsx'
import '../admin/admin.css'

// Asks the server whether this browser is signed in. Resolves to
// 'in' | 'locked' | 'out' | 'offline' (the server could not be reached).
async function askServer() {
  let res
  try {
    res = await fetch('/api/admin/me', { cache: 'no-store' })
  } catch {
    reportNetwork(false)
    return 'offline'
  }
  reportNetwork(true)
  const body = await res.json().catch(() => ({}))
  if (res.ok) {
    rememberSession({ lock: body.lock })
    return 'in'
  }
  if (body.locked) return 'locked'
  // Signed out (or the 7-day sign-in ran out): nothing from before stays on the device.
  if (res.status === 401) clearCache()
  return 'out'
}

export default function Admin() {
  // With fingerprint unlock off and last-known data on this device, the
  // dashboard opens straight away from that data while the server is asked.
  // Never on a phone with fingerprint unlock set up: there the lock decides first.
  const [status, setStatus] = useState(() => (canOpenFromCache() && !(isNative() && thisDeviceId()) ? 'in' : 'checking')) // checking | out | locked | in | offline
  const statusRef = useRef(status)
  statusRef.current = status
  useAdminApp()

  const launched = useRef(false)
  const check = useCallback(async () => {
    // A fresh start of the Android app with fingerprint unlock set up: ask for
    // the fingerprint before anything else, like WhatsApp (nativeLock.js).
    if (!launched.current) {
      launched.current = true
      if (await lockAtLaunch()) {
        setStatus('locked')
        // Only a signed-out answer changes that (then the password is needed anyway).
        askServer().then((answer) => answer === 'out' && setStatus('out'))
        return
      }
    }
    const answer = await askServer()
    const now = statusRef.current
    if (answer === 'offline') {
      // Already showing the dashboard from saved data: keep it, the offline banner explains.
      if (now !== 'in') setStatus('offline')
      return
    }
    // Leaving the dashboard: anything waiting for a sign-in prompt is dropped with it.
    if (now === 'in' && answer !== 'in') reauthCancelled()
    setStatus(answer)
  }, [])

  useEffect(() => {
    check()
  }, [check])

  // The app (APK 1.2+) keeps its window covered on a fresh start until this page
  // has decided what to show: the lock screen, or whatever else is safe.
  useEffect(() => {
    if (status !== 'checking') confirmLockShown()
  }, [status])

  // Offline screen: try again as soon as the phone says it is back online.
  useEffect(() => {
    if (status !== 'offline') return
    const again = () => {
      setStatus('checking')
      check()
    }
    window.addEventListener('online', again)
    return () => window.removeEventListener('online', again)
  }, [status, check])

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

  // After signing in or unlocking, note on this device whether the session
  // needs an unlock (decides whether the next open can start from saved data).
  const signedIn = useCallback(() => {
    setStatus('in')
    askServer().catch(() => {})
  }, [])

  async function handleLogout() {
    clearCache()
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
      {status === 'offline' && (
        <OfflineScreen
          onRetry={() => {
            setStatus('checking')
            check()
          }}
        />
      )}
      {status === 'out' && <AdminLogin onLogin={signedIn} />}
      {status === 'locked' && <LockScreen onUnlocked={signedIn} onLogout={handleLogout} />}
      {status === 'in' && (
        <>
          <AdminDashboard onLogout={handleLogout} />
          <ReauthPrompt onLogout={handleLogout} />
        </>
      )}
    </div>
  )
}

// Shown instead of a blank page when the server cannot be reached and there is
// nothing saved on this device that can be shown without signing in.
function OfflineScreen({ onRetry }) {
  return (
    <div className="admin-offline-screen" role="alert">
      <div className="admin-offline-card">
        <span className="admin-offline-icon" aria-hidden="true"><WifiOff size={22} /></span>
        <h1>You’re offline</h1>
        <p>The admin needs a connection to check it’s you. Your unsaved post writing is kept on this device.</p>
        <button type="button" className="admin-btn admin-btn-icon-text" onClick={onRetry}>
          <RefreshCw size={16} aria-hidden="true" /> Retry
        </button>
      </div>
    </div>
  )
}
