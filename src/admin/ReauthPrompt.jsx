import { useEffect, useRef, useState } from 'react'
import { Lock } from 'lucide-react'
import { onReauthChange, reauthCancelled, reauthDone } from './http.js'

// Shown over the admin when the session expires mid-edit. Signing in here keeps
// everything on screen as it was and finishes the request that was waiting.
export default function ReauthPrompt({ onLogout }) {
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const input = useRef(null)

  useEffect(() => onReauthChange(setOpen), [])
  useEffect(() => {
    if (open) {
      setPassword('')
      setError(null)
      requestAnimationFrame(() => input.current?.focus())
    }
  }, [open])

  if (!open) return null

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
        <h2 id="reauth-title" className="admin-card-title">Your session expired</h2>
        <p className="admin-hint">
          Sign in again to carry on. Nothing on screen is lost, and the change you were making is sent as soon as you are back in.
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
