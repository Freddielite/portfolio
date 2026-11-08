import { useEffect, useRef, useState } from 'react'
import { Fingerprint, KeyRound } from 'lucide-react'
import { supportsPasskeys, unlockNativeOnServer, unlockWithPasskey } from './passkeys.js'
import { isNative, nativeIsSetUp, unlockNative } from './native.js'
import { IS_APP } from './app.js'

// Covers the whole admin while it is locked (fingerprint unlock is on and you
// were away for a while). Fully opaque, so nothing behind it can be read.
// Fingerprint or face is the quick way back in; the password always works too.
export default function LockScreen({ onUnlocked, onLogout }) {
  const native = isNative()
  // In the Android app the phone's own fingerprint is used, once it is set up.
  const [canBio, setCanBio] = useState(native ? false : supportsPasskeys())
  const [mode, setMode] = useState(!native && canBio ? 'bio' : 'password')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [password, setPassword] = useState('')
  const tried = useRef(false)
  const pwRef = useRef(null)

  async function bio() {
    setBusy(true)
    setError(null)
    try {
      await (native ? unlockNative(unlockNativeOnServer) : unlockWithPasskey())
      onUnlocked()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    if (!native) return
    let live = true
    nativeIsSetUp().then((ok) => {
      if (live && ok) {
        setCanBio(true)
        setMode('bio')
      }
    })
    return () => {
      live = false
    }
  }, [native])

  // In the installed app, ask for the fingerprint straight away.
  useEffect(() => {
    if (tried.current || !canBio || !IS_APP) return
    tried.current = true
    bio()
  }, [canBio]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (mode === 'password') requestAnimationFrame(() => pwRef.current?.focus())
  }, [mode])

  async function submitPassword(e) {
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
      onUnlocked()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="admin-lock" role="dialog" aria-modal="true" aria-labelledby="admin-lock-title">
      <div className="admin-lock-inner">
        <div className="admin-lock-icon" aria-hidden="true">{mode === 'bio' ? <Fingerprint size={30} /> : <KeyRound size={28} />}</div>
        <h1 id="admin-lock-title">Admin is locked</h1>
        <p className="admin-lock-sub">
          {mode === 'bio'
            ? 'It locks after time away. Use your fingerprint or face to carry on where you were.'
            : 'Enter your admin password to unlock.'}
        </p>

        {mode === 'bio' ? (
          <button type="button" className="admin-btn admin-lock-main" onClick={bio} disabled={busy}>
            <Fingerprint size={18} aria-hidden="true" /> {busy ? 'Waiting for your fingerprint…' : 'Unlock'}
          </button>
        ) : (
          <form onSubmit={submitPassword} className="admin-lock-form">
            <input
              ref={pwRef}
              type="password"
              autoComplete="current-password"
              placeholder="Password"
              aria-label="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button type="submit" className="admin-btn admin-lock-main" disabled={busy || !password}>
              {busy ? 'Unlocking…' : 'Unlock'}
            </button>
          </form>
        )}

        {error && <p className="admin-error admin-lock-error" role="alert">{error}</p>}

        <div className="admin-lock-alt">
          {canBio && (
            <button type="button" className="admin-inline-link" onClick={() => { setError(null); setMode(mode === 'bio' ? 'password' : 'bio') }}>
              {mode === 'bio' ? 'Use password instead' : 'Use fingerprint or face instead'}
            </button>
          )}
          <button type="button" className="admin-inline-link admin-lock-logout" onClick={onLogout}>Log out</button>
        </div>
      </div>
    </div>
  )
}
