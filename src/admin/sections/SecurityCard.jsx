import { useEffect, useState } from 'react'
import { Fingerprint, ShieldCheck, Smartphone, Trash2, Plus } from 'lucide-react'
import { useAdmin } from '../AdminContext.jsx'
import { addPasskey, deviceLabel, listPasskeys, removePasskey, supportsPasskeys } from '../passkeys.js'

const when = (iso) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

// Overview card: turn fingerprint / face unlock on for this device, see which
// devices have it, remove one.
export default function SecurityCard() {
  const { toast, confirm } = useAdmin()
  const [state, setState] = useState({ loading: true, list: [], minutes: 10, error: null })
  const [busy, setBusy] = useState(false)
  const canBio = supportsPasskeys()

  useEffect(() => {
    listPasskeys()
      .then((d) => setState({ loading: false, list: d.passkeys, minutes: d.lockMinutes, error: null }))
      .catch((e) => setState((s) => ({ ...s, loading: false, error: e.message })))
  }, [])

  const on = state.list.length > 0

  async function add() {
    setBusy(true)
    try {
      const d = await addPasskey(deviceLabel())
      setState((s) => ({ ...s, list: d.passkeys, error: null }))
      toast(on ? 'This device can now unlock the admin' : 'Fingerprint unlock is on')
    } catch (err) {
      toast(err.message, { tone: 'error' })
    } finally {
      setBusy(false)
    }
  }

  async function remove(p) {
    const last = state.list.length === 1
    const ok = await confirm({
      title: `Remove ${p.label}?`,
      body: last
        ? 'It is the only device set up, so fingerprint unlock turns off and the admin stops locking. Your 7-day password sign-in stays.'
        : 'That device will need the password to unlock the admin until you set it up again.',
      confirmLabel: last ? 'Turn off unlock' : 'Remove device',
      tone: 'danger',
    })
    if (!ok) return
    setBusy(true)
    try {
      const d = await removePasskey(p.id)
      setState((s) => ({ ...s, list: d.passkeys }))
      toast(last ? 'Fingerprint unlock is off' : `Removed ${p.label}`)
    } catch (err) {
      toast(err.message, { tone: 'error' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="admin-card admin-security" id="security">
      <div className="admin-card-header">
        <div>
          <h2 className="admin-card-title">Security</h2>
          <p className="admin-hint">
            {state.loading ? 'Checking…' : on
              ? `Locks after ${state.minutes} minutes away. Your fingerprint or face unlocks it.`
              : 'Fingerprint unlock is off. Anyone holding your signed-in phone can open the admin.'}
          </p>
        </div>
        <span className={`admin-security-state ${on ? 'is-on' : ''}`} aria-hidden="true">
          {on ? <ShieldCheck size={20} /> : <Fingerprint size={20} />}
        </span>
      </div>

      {state.error && <p className="admin-error">{state.error}</p>}

      {on && (
        <ul className="admin-devices">
          {state.list.map((p) => (
            <li key={p.id}>
              <Smartphone size={18} aria-hidden="true" />
              <span>
                <strong>{p.label}</strong>
                <span className="admin-hint">Set up {when(p.createdAt)}</span>
              </span>
              <button type="button" className="admin-icon-btn is-danger" onClick={() => remove(p)} disabled={busy} aria-label={`Remove ${p.label}`}>
                <Trash2 size={16} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {!state.loading && (
        canBio ? (
          <button type="button" className={on ? 'admin-btn-ghost admin-btn-icon-text' : 'admin-btn admin-btn-icon-text'} onClick={add} disabled={busy}>
            {on ? <Plus size={15} aria-hidden="true" /> : <Fingerprint size={16} aria-hidden="true" />}
            {busy ? 'Waiting for your fingerprint…' : on ? 'Add this device' : 'Turn on fingerprint unlock'}
          </button>
        ) : (
          <p className="admin-hint">This browser cannot use fingerprint or face unlock. Open the admin on your phone to set it up.</p>
        )
      )}

      <p className="admin-hint admin-security-note">
        Signing in with your password lasts 7 days on each device, then it asks again.
      </p>
    </section>
  )
}
