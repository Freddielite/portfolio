import useInView from '../hooks/useInView.js'
import useContent from '../hooks/useContent.js'
import { getTestimonials } from '../lib/content.js'
import fallbackTestimonials from '../data/testimonials.js'

export default function Testimonials() {
  const [ref, inView] = useInView({ threshold: 0.15 })
  const [testimonials] = useContent(getTestimonials, fallbackTestimonials)

  if (!testimonials.length) return null

  return (
    <section id="testimonials" className={`testimonials reveal ${inView ? 'in-view' : ''}`} ref={ref}>
      <p className="eyebrow">What people say</p>
      <h2>From the other side of the project.</h2>

      <div className="testimonial-grid">
        {testimonials.map((t, i) => (
          <blockquote
            className="testimonial-card"
            key={t.id}
            style={{ transitionDelay: inView ? `${i * 100}ms` : '0ms' }}
          >
            <p className="testimonial-quote">&ldquo;{t.quote}&rdquo;</p>
            <footer>
              <span className="testimonial-author">{t.author}</span>
              {t.role && <span className="testimonial-role">{t.role}</span>}
            </footer>
          </blockquote>
        ))}
      </div>
    </section>
  )
}
