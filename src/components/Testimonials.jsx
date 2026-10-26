import Reveal from './Reveal.jsx'
import useContent from '../hooks/useContent.js'
import { getTestimonials } from '../lib/content.js'
import fallbackTestimonials from '../data/testimonials.js'
import { useSiteSettings } from '../context/SiteSettingsContext.jsx'

const PLACEHOLDER = /^client name$/i

export default function Testimonials() {
  const [testimonials] = useContent(getTestimonials, fallbackTestimonials)
  const s = useSiteSettings()

  if (s.showTestimonials === false) return null
  if (!testimonials.length) return null

  return (
    <section id="testimonials" className="section">
      <Reveal as="p" className="eyebrow">What people say</Reveal>
      <Reveal as="h2" className="hb">From the other side of the project.</Reveal>
      <div className="quote-grid">
        {testimonials.map((t, i) => {
          const author = t.author && !PLACEHOLDER.test(t.author.trim()) ? t.author : null
          return (
            <Reveal as="blockquote" className="card quote" delay={i * 90} key={t.id}>
              <p>&ldquo;{t.quote}&rdquo;</p>
              <footer>
                {author && <span className="quote-author">{author}</span>}
                {t.role && <span className="mono-label">{t.role}</span>}
              </footer>
            </Reveal>
          )
        })}
      </div>
    </section>
  )
}
