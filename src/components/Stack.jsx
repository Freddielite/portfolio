const layers = [
  {
    label: 'Frontend',
    tag: 'UI',
    items: ['React', 'Responsive layout & CSS Grid', 'Interactive checkout & booking flows'],
  },
  {
    label: 'Backend & APIs',
    tag: 'API',
    items: ['Django REST Framework', 'JWT & OTP authentication', 'Celery / Redis async jobs'],
  },
  {
    label: 'Infrastructure & Security',
    tag: 'NET',
    items: ['Deployment & hosting', 'Networking & hardening', 'Client site maintenance'],
  },
]

// TODO (Wilfred): trim/expand this to match the tools you actually reach for.
const tools = ['React', 'Vite', 'Django REST Framework', 'PostgreSQL', 'MySQL', 'Redis', 'Docker', 'Nginx', 'Linux', 'Git', 'Paystack API', 'JWT / OAuth']

import useInView from '../hooks/useInView.js'

export default function Stack() {
  const [ref, inView] = useInView({ threshold: 0.15 })

  return (
    <section id="stack" className={`stack reveal ${inView ? 'in-view' : ''}`} ref={ref}>
      <p className="eyebrow">How it's built</p>
      <h2>Three layers, one build.</h2>
      <p className="section-sub">
        Wyntek Technologies work spans design, engineering and the network and
        security layer underneath it, and every project below touches at least one of these.
      </p>

      <div className="split-grid stack-split">
        <div className="stack-layers">
          {layers.map((layer, i) => (
            <div className="stack-layer" key={layer.label}>
              <div className="stack-tag-col">
                <span className="stack-tag">{layer.tag}</span>
                {i < layers.length - 1 && <span className="stack-connector" aria-hidden="true" />}
              </div>
              <div className="stack-content">
                <h3>{layer.label}</h3>
                <ul>
                  {layer.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        <div className="network-card split-side">
          <div className="network-card-header">
            <span className="network-card-title">WILFRED / TOOLS &amp; PLATFORMS</span>
            <span className="network-card-status">
              <span className="status-dot" /> ACTIVE
            </span>
          </div>
          <div className="tool-pills">
            {tools.map((tool) => (
              <span className="tag" key={tool}>{tool}</span>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
