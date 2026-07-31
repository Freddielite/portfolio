import useInView from '../hooks/useInView.js'

export default function Contact() {
  const [ref, inView] = useInView({ threshold: 0.2 })

  return (
    <section id="contact" className={`contact reveal ${inView ? 'in-view' : ''}`} ref={ref}>
      <p className="eyebrow">Get in touch</p>
      <h2>Let's build something.</h2>
      <p className="section-sub">
        Open to retainer-based and project-based work: web design, backend
        builds, and the infrastructure to run them.
      </p>
      <div className="contact-actions">
        <a href="mailto:wynteknologies@gmail.com" className="btn btn-primary">Email me</a>
        <a href="https://github.com/Freddielite" target="_blank" rel="noreferrer" className="btn btn-ghost">
          GitHub ↗
        </a>
      </div>
      <p className="footer-note"><strong className="name-strong">Wilfred Oseghale</strong> · Wyntek Technologies</p>
    </section>
  )
}
