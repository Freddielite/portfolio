import { useCallback, useEffect, useState } from 'react'
import { Bell, BellOff, RefreshCw, Smartphone, Trash2 } from 'lucide-react'
import { useAdmin } from '../AdminContext.jsx'
import { adminFetch } from '../http.js'
import { deviceLabel } from '../passkeys.js'
import { agoText } from '../cache.js'
import {
  alertsCheckNow, alertsDisable, alertsEnable, alertsSetKinds, alertsStatus, alertsTest, isNative,
  openNotificationSettings, requestNotifications,
} from '../native.js'

// Overview card: alerts on this phone ("Kall Konnect is down", "New subscriber",
// "Site finished rebuilding"). The Android app checks about every 15 minutes,
// also while the admin is closed. In a browser the card only lists the phones
// that get alerts, so a lost phone can be cut off from here.

const KINDS = [
  { key: 'health', label: 'A site goes down or comes back up' },
  { key: 'subscribers', label: 'Someone subscribes' },
  { key: 'deploys', label: 'The site finished rebuilding' },
]

async function api(step, payload) {
  const res = await adminFetch(`/api/admin/alerts?step=${step}`, payload
    ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }
    : { cache: 'no-store' })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.error || 'Could not reach the site.')
  return body
}

export default function PhoneAlertsCard() {
  const { toast, confirm } = useAdmin()
  const native = isNative()
  const [phone, setPhone] = useState(null) // what the app says, or { supported: false }
  const [devices, setDevices] = useState(null)
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(async () => {
    setPhone(await alertsStatus())
    api('list').then((b) => setDevices(b.devices || [])).catch(() => {})
  }, [])

  useEffect(() => {
    refresh()
    // Back from Android's settings, or the app reopened: show the latest state.
    const onVisible = () => document.visibilityState === 'visible' && refresh()
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [refresh])

  async function turnOn() {
    setBusy(true)
    let registered = null
    try {
      let state = await requestNotifications()
      if (state.permission !== 'granted') {
        setPhone(state)
        toast('Notifications are blocked for this app. Allow them, then try again.', { tone: 'error', duration: 6000 })
        return
      }
      registered = await api('register', { label: deviceLabel() })
      state = await alertsEnable({ base: window.location.origin, id: registered.id, token: registered.token, health: true, subscribers: true, deploys: true })
      setPhone(state)
      setDevices(registered.devices)
      toast('Alerts are on for this phone')
    } catch (err) {
      // Turned on at the site but not on the phone: undo the site half.
      if (registered) api('remove', { id: registered.id }).catch(() => {})
      toast(err.message || 'Could not turn alerts on.', { tone: 'error' })
    } finally {
      setBusy(false)
    }
  }

  async function turnOff() {
    setBusy(true)
    try {
      const { id } = await alertsDisable()
      setPhone(await alertsStatus())
      if (id) setDevices((await api('remove', { id })).devices)
      toast('Alerts are off for this phone')
    } catch (err) {
      toast(err.message || 'Could not turn alerts off.', { tone: 'error' })
    } finally {
      setBusy(false)
    }
  }

  async function setKind(key, on) {
    setPhone((p) => ({ ...p, [key]: on }))
    try {
      setPhone(await alertsSetKinds({ [key]: on }))
    } catch {
      setPhone(await alertsStatus())
    }
  }

  async function removeOther(d) {
    const ok = await confirm({
      title: `Stop alerts on ${d.label}?`,
      body: 'That phone stops getting alerts at its next check. Turn them on again from the phone itself.',
      confirmLabel: 'Stop alerts',
      tone: 'danger',
    })
    if (!ok) return
    try {
      setDevices((await api('remove', { id: d.id })).devices)
      toast(`Alerts stopped on ${d.label}`)
    } catch (err) {
      toast(err.message, { tone: 'error' })
    }
  }

  const on = !!phone?.on
  const others = (devices || []).filter((d) => d.id !== phone?.id)

  // In a browser, only worth showing when some phone gets alerts.
  if (!native && !others.length) return null

  const when = phone?.lastCheck
    ? `Last checked ${agoText(phone.lastCheck)}.`
    : on
      ? 'First check runs as soon as the phone is online.'
      : null

  return (
    <section className="admin-card admin-alerts-card">
      <div className="admin-card-header">
        <div>
          <h2 className="admin-card-title">Phone alerts</h2>
          <p className="admin-hint">
            {native
              ? 'Notifications when a site goes down, someone subscribes or the site finishes rebuilding. Checked about every 15 minutes, sometimes later while the phone is idle.'
              : 'Phones that get alerts from the Android app.'}
          </p>
        </div>
        {native && on && (
          <button
            type="button"
            className="admin-icon-btn"
            aria-label="Check now"
            onClick={async () => {
              setPhone(await alertsCheckNow())
              toast('Checking now. Anything new shows as a notification.')
              setTimeout(refresh, 8000)
            }}
          >
            <RefreshCw size={16} aria-hidden="true" />
          </button>
        )}
      </div>

      {native && phone && !phone.supported && (
        <p className="admin-hint">Install the latest version of the app to get alerts on this phone.</p>
      )}

      {native && phone?.supported && !on && (
        <>
          {phone.permission === 'denied' && (
            <div className="admin-note-row">
              <p className="admin-hint">Notifications are switched off for this app in Android settings.</p>
              <button type="button" className="admin-link" onClick={openNotificationSettings}>Open settings</button>
            </div>
          )}
          <button type="button" className="admin-btn admin-btn-icon-text" onClick={turnOn} disabled={busy}>
            <Bell size={16} aria-hidden="true" /> {busy ? 'Turning on…' : 'Turn on alerts'}
          </button>
        </>
      )}

      {native && phone?.supported && on && (
        <>
          {phone.permission !== 'granted' && (
            <div className="admin-note-row">
              <p className="admin-error">Alerts are on, but Android is blocking this app’s notifications, so you won’t see them.</p>
              <button type="button" className="admin-link" onClick={openNotificationSettings}>Open settings</button>
            </div>
          )}
          <div className="admin-native-settings">
            {KINDS.map((k) => (
              <label key={k.key} className="admin-native-row">
                <span>{k.label}</span>
                <input type="checkbox" checked={!!phone[k.key]} onChange={(e) => setKind(k.key, e.target.checked)} />
              </label>
            ))}
          </div>
          {(when || phone.lastError) && (
            <p className={phone.lastError ? 'admin-hint admin-alerts-status is-warn' : 'admin-hint admin-alerts-status'}>
              {[when, phone.lastError].filter(Boolean).join(' ')}
            </p>
          )}
          <div className="admin-row">
            <button
              type="button"
              className="admin-btn-ghost admin-btn-icon-text"
              onClick={async () => setPhone(await alertsTest())}
              disabled={busy}
            >
              <Bell size={15} aria-hidden="true" /> Send a test
            </button>
            <button type="button" className="admin-btn-ghost admin-btn-icon-text" onClick={turnOff} disabled={busy}>
              <BellOff size={15} aria-hidden="true" /> {busy ? 'Turning off…' : 'Turn off'}
            </button>
          </div>
        </>
      )}

      {others.length > 0 && (
        <>
          <p className="admin-hint admin-alerts-others">{native ? 'Other phones with alerts' : 'Phones'}</p>
          <ul className="admin-rows">
            {others.map((d) => (
              <li key={d.id}>
                <span className="admin-row-main">
                  <strong><Smartphone size={14} aria-hidden="true" /> {d.label}</strong>
                  <span className="admin-hint">Since {new Date(d.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                </span>
                <button type="button" className="admin-icon-btn is-danger" onClick={() => removeOther(d)} aria-label={`Stop alerts on ${d.label}`}>
                  <Trash2 size={16} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
