import useInView from '../hooks/useInView.js'
import { useSiteSettings } from '../context/SiteSettingsContext.jsx'
import ContactForm from './ContactForm.jsx'

export default function Contact() {
  const [ref, inView] = useInView({ threshold: 0.2 })
  const s = useSiteSettings()

  return (
    <section id="contact" className={`contact reveal ${inView ? 'in-view' : ''}`} ref={ref}>
      <p className="eyebrow">Get in touch</p>
      <h2>{s.contactHeadline}</h2>
      <p className="section-sub">{s.contactSub}</p>

      <ContactForm />

      <div className="contact-actions">
        <a href={`mailto:${s.email}`} className="btn btn-primary">Email me</a>
        <a href={s.githubUrl} target="_blank" rel="noreferrer" className="btn btn-ghost">
          GitHub ↗
        </a>
      </div>
      <p className="footer-note"><strong className="name-strong">{s.name}</strong> · {s.company}</p>
    </section>
  )
}
