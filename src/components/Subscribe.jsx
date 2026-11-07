import { useState } from 'react'
import { useSiteSettings } from '../context/SiteSettingsContext.jsx'

// Email signup that posts straight to a Wynmail signup form (no API key in the
// browser). Wynmail does the consent record, confirmation email and spam checks.
// Shows nothing until the API URL and form slug are set in /admin > Settings.
export default function Subscribe({ variant = 'footer' }) {
  const s = useSiteSettings()
  const base = String(s.newsletterApiUrl || '').replace(/\/+$/, '')
  const slug = String(s.newsletterFormSlug || '').trim()
  const [email, setEmail] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [state, setState] = useState({ status: 'idle', message: '' }) // idle | sending | sent | error

  if (!/^https:\/\//i.test(base) || !/^[\w-]{1,80}$/.test(slug)) return null

  async function submit(e) {
    e.preventDefault()
    const honeypot = e.target.elements.website?.value || ''
    setState({ status: 'sending', message: '' })
    try {
      const res = await fetch(`${base}/f/${slug}/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ email: email.trim(), consent: agreed, website: honeypot }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || 'Something went wrong. Please try again.')
      setState({ status: 'sent', message: body.message || 'Thanks! Check your inbox to confirm your subscription.' })
      setEmail('')
      setAgreed(false)
    } catch (err) {
      const offline = err instanceof TypeError
      setState({ status: 'error', message: offline ? 'Could not reach the signup service. Please try again in a minute.' : err.message })
    }
  }

  return (
    <section className={`subscribe subscribe-${variant}`} aria-label="Email updates">
      <div className="subscribe-copy">
        <h3>New posts by email</h3>
        <p>A short note when I publish something new. No spam, unsubscribe any time.</p>
      </div>
      {state.status === 'sent' ? (
        <p className="subscribe-done" role="status">{state.message}</p>
      ) : (
        <form className="subscribe-form" onSubmit={submit}>
          <div className="subscribe-row">
            <label className="sr-only" htmlFor={`sub-email-${variant}`}>Email address</label>
            <input
              id={`sub-email-${variant}`}
              type="email"
              name="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@example.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button type="submit" className="btn btn-primary" disabled={state.status === 'sending' || !agreed}>
              {state.status === 'sending' ? 'Subscribing…' : 'Subscribe'}
            </button>
          </div>
          <label className="subscribe-consent">
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} required />
            <span>I agree to receive emails and understand I can unsubscribe at any time.</span>
          </label>
          <input className="subscribe-hp" type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" />
          {state.status === 'error' && <p className="form-err" role="alert">{state.message}</p>}
        </form>
      )}
    </section>
  )
}
