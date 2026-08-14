import { useState } from 'react'
import { useSiteSettings } from '../context/SiteSettingsContext.jsx'

export default function ContactForm() {
  const s = useSiteSettings()
  const [status, setStatus] = useState('idle') // idle | sending | sent | error

  if (!s.formspreeId) {
    // No Formspree ID configured yet — quietly skip rendering the form and
    // let the mailto/GitHub buttons in Contact.jsx carry the section.
    return null
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setStatus('sending')
    const form = e.target
    try {
      const res = await fetch(`https://formspree.io/f/${s.formspreeId}`, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: new FormData(form),
      })
      if (res.ok) {
        setStatus('sent')
        form.reset()
      } else {
        setStatus('error')
      }
    } catch {
      setStatus('error')
    }
  }

  if (status === 'sent') {
    return (
      <p className="contact-form-success">
        Thanks — your message is in my inbox. I'll get back to you soon.
      </p>
    )
  }

  return (
    <form className="contact-form" onSubmit={handleSubmit}>
      <div className="contact-form-row">
        <label htmlFor="name">Name</label>
        <input id="name" name="name" type="text" required />
      </div>
      <div className="contact-form-row">
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" required />
      </div>
      <div className="contact-form-row">
        <label htmlFor="message">Message</label>
        <textarea id="message" name="message" rows={4} required />
      </div>
      <button type="submit" className="btn btn-primary" disabled={status === 'sending'}>
        {status === 'sending' ? 'Sending…' : 'Send message'}
      </button>
      {status === 'error' && (
        <p className="contact-form-error">
          Something went wrong — try again, or email me directly below.
        </p>
      )}
    </form>
  )
}
