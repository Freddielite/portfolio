import { useState } from 'react'
import Reveal from './Reveal.jsx'
import { useSiteSettings } from '../context/SiteSettingsContext.jsx'

const TYPES = ['Business website', 'Online store', 'Web app or dashboard', 'Backend or API', 'Security or networking']
const TIMES = ['As soon as possible', '1 to 3 months', 'Flexible']
const ENGAGE = ['One-off project', 'Monthly retainer', 'Not sure yet']

function Group({ label, items, value, onChange }) {
  return (
    <div className="bld-group">
      <p className="mono-label">{label}</p>
      <div className="chip-row">
        {items.map((it) => (
          <button
            key={it}
            type="button"
            className={`chip ${value === it ? 'on' : ''}`}
            aria-pressed={value === it}
            onClick={() => onChange(it)}
          >
            {it}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function Contact() {
  const s = useSiteSettings()
  const [type, setType] = useState(TYPES[0])
  const [time, setTime] = useState(TIMES[0])
  const [engage, setEngage] = useState(ENGAGE[0])
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [details, setDetails] = useState('')
  const [copied, setCopied] = useState(false)
  const [status, setStatus] = useState('idle')

  const brief = [
    `Hi ${s.shortName},`,
    '',
    `I am ${name.trim() || '[your name]'}.${email.trim() ? ` You can reach me at ${email.trim()}.` : ''}`,
    `I need: ${type}.`,
    `Timeline: ${time}.`,
    `Engagement: ${engage}.`,
    '',
    details.trim() || '[a few lines about the project]',
    '',
    'Thanks.',
  ].join('\n')

  const mailto = `mailto:${s.email}?subject=${encodeURIComponent(`Project enquiry: ${type}`)}&body=${encodeURIComponent(brief)}`
  const whatsapp = `${s.whatsappUrl}?text=${encodeURIComponent(brief)}`

  async function copy() {
    try {
      await navigator.clipboard.writeText(brief)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard blocked, the text is still selectable */
    }
  }

  async function sendForm(e) {
    e.preventDefault()
    setStatus('sending')
    try {
      const res = await fetch(`https://formspree.io/f/${s.formspreeId}`, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message: brief, type, timeline: time, engagement: engage }),
      })
      setStatus(res.ok ? 'sent' : 'error')
    } catch {
      setStatus('error')
    }
  }

  return (
    <section id="contact" className="section contact">
      <Reveal as="p" className="eyebrow">Get in touch</Reveal>
      <Reveal as="h2" className="hb">{s.contactHeadline}</Reveal>
      <p className="section-sub">{s.contactSub}</p>

      <div className="bld">
        <Reveal className="bld-form">
          <Group label="1 / What are you building" items={TYPES} value={type} onChange={setType} />
          <Group label="2 / Timeline" items={TIMES} value={time} onChange={setTime} />
          <Group label="3 / Engagement" items={ENGAGE} value={engage} onChange={setEngage} />
          <div className="bld-fields">
            <input className="field" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} aria-label="Your name" />
            <input className="field" type="email" placeholder="Your email (optional)" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Your email" />
          </div>
          <textarea className="field" rows={4} placeholder="A few lines about the project" value={details} onChange={(e) => setDetails(e.target.value)} aria-label="Project details" />
        </Reveal>

        <Reveal className="card bld-preview" delay={120}>
          <span className="mono-label">Your brief, live</span>
          <pre>{brief}</pre>
          <div className="bld-actions">
            <a className="btn btn-primary" href={mailto}>Send by email</a>
            <a className="btn btn-ghost" href={whatsapp} target="_blank" rel="noreferrer">WhatsApp ↗</a>
            <button type="button" className="btn btn-ghost" onClick={copy}>{copied ? 'Copied' : 'Copy brief'}</button>
          </div>
          {s.formspreeId && (
            <div className="bld-send">
              {status === 'sent' ? (
                <p className="form-ok">Thanks, your brief is in my inbox. I'll get back to you soon.</p>
              ) : (
                <button type="button" className="link-btn" onClick={sendForm} disabled={status === 'sending' || !email.trim()}>
                  {status === 'sending' ? 'Sending…' : 'Or send it straight to my inbox →'}
                </button>
              )}
              {status === 'error' && <p className="form-err">Something went wrong, try email or WhatsApp instead.</p>}
              {!email.trim() && status !== 'sent' && <p className="hint">Add your email to send directly.</p>}
            </div>
          )}
        </Reveal>
      </div>
    </section>
  )
}
