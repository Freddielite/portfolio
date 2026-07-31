import useInView from '../hooks/useInView.js'

export default function About() {
  const [ref, inView] = useInView({ threshold: 0.2 })

  return (
    <section id="about" className={`about reveal ${inView ? 'in-view' : ''}`} ref={ref}>
      <div className="split-grid">
        <div className="split-main">
          <p className="eyebrow">About me</p>
          <h2>Who I am.</h2>
          <div className="about-body">
            {/* TODO (Wilfred): replace with your own words, this is a starting draft
                based on what you've shared about your work. */}
            <p>
              I run Wyntek Technologies, a Nigeria-based studio doing web design,
              networking and security work. I like taking a project from a rough
              idea to something real and working: a storefront that converts, an
              API that holds up, a server that stays online.
            </p>
            <p>
              Most of my work sits at the intersection of the three things I'm
              best at: building the interface, building the backend behind it,
              and making sure the whole thing is secure and stays up. I take on
              both one-off client builds and longer retainer work for small
              businesses and larger teams.
            </p>
          </div>
        </div>

        <div className="network-card split-side">
          <div className="network-card-header">
            <span className="network-card-title">WILFRED / QUICK FACTS</span>
            <span className="network-card-status">
              <span className="status-dot" /> AVAILABLE FOR WORK
            </span>
          </div>
          <ul className="fact-list">
            <li>
              <span className="fact-label">Based in</span>
              <span>Nigeria</span>
            </li>
            <li>
              <span className="fact-label">Focus areas</span>
              <span>Frontend, backend, security</span>
            </li>
            <li>
              <span className="fact-label">Runs</span>
              <span>Wyntek Technologies</span>
            </li>
            <li>
              <span className="fact-label">Works with</span>
              <span>Small businesses &amp; larger teams</span>
            </li>
            <li>
              <span className="fact-label">Engagement</span>
              <span>One-off builds &amp; retainers</span>
            </li>
          </ul>
        </div>
      </div>
    </section>
  )
}
