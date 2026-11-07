import { useEffect, useRef, useState } from 'react'
import { Lock } from 'lucide-react'
import { onReauthChange, reauthCancelled, reauthDone } from './http.js'
import LockScreen from './LockScreen.jsx'

// Shown over the admin when a request is turned away. 'locked': the lock
// screen (fingerprint, face or password). 'expired': the 7-day sign-in ran
// out, so the password is needed. Either way everything on screen stays as it
// was and the request that was waiting is sent once you are back in.
export default function ReauthPrompt({ onLogout }) {
  const [reason, setReason] = useState(null)
  const open = !!reason
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const input = useRef(null)

  useEffect(() => onReauthChange(setReason), [])
  useEffect(() => {
    if (open) {
      setPassword('')
      setError(null)
      requestAnimationFrame(() => input.current?.focus())
    }
  }, [open])

  if (!open) return null
  if (reason === 'locked') {
    return (
      <LockScreen
        onUnlocked={reauthDone}
        onLogout={() => {
          reauthCancelled()
          onLogout()
        }}
      />
    )
  }

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || 'Sign-in failed.')
      reauthDone()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="admin-modal-overlay admin-reauth" role="presentation">
      <form className="admin-modal" role="alertdialog" aria-modal="true" aria-labelledby="reauth-title" onSubmit={submit}>
        <div className="admin-reauth-icon" aria-hidden="true"><Lock size={20} /></div>
        <h2 id="reauth-title" className="admin-card-title">Sign in again</h2>
        <p className="admin-hint">
          Your sign-in lasts 7 days and has run out. Nothing on screen is lost, and the change you were making is sent as soon as you are back in.
        </p>
        <input
          ref={input}
          type="password"
          autoComplete="current-password"
          placeholder="Password"
          aria-label="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className="admin-error">{error}</p>}
        <div className="admin-row">
          <button type="submit" className="admin-btn" disabled={busy || !password}>{busy ? 'Signing in…' : 'Sign in and continue'}</button>
          <button
            type="button"
            className="admin-btn-ghost"
            disabled={busy}
            onClick={() => {
              reauthCancelled()
              onLogout()
            }}
          >
            Log out
          </button>
        </div>
      </form>
    </div>
  )
}
