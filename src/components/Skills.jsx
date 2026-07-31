import skills from '../data/skills.js'
import useInView from '../hooks/useInView.js'

export default function Skills() {
  const [ref, inView] = useInView({ threshold: 0.2 })

  return (
    <section id="skills" className={`skills reveal ${inView ? 'in-view' : ''}`} ref={ref}>
      <div className="split-grid">
        <div className="split-main">
          <p className="eyebrow">Skills</p>
          <h2>What I bring to a project.</h2>
          <p className="section-sub">
            Rough self-rating across the areas I work in most.
          </p>

          <div className="skill-list">
            {skills.map((skill) => (
              <div className="skill-row" key={skill.name}>
                <div className="skill-label">
                  <span>{skill.name}</span>
                  <span className="skill-level">{skill.level}%</span>
                </div>
                <div className="skill-track">
                  <div
                    className="skill-fill"
                    style={{ width: inView ? `${skill.level}%` : '0%' }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="network-card split-side">
          <div className="network-card-header">
            <span className="network-card-title">WILFRED / AVAILABILITY</span>
            <span className="network-card-status">
              <span className="status-dot" /> OPEN
            </span>
          </div>

          {/* TODO (Wilfred): adjust these to match how you actually work */}
          <div className="side-block">
            <p className="side-label">Response time</p>
            <p className="side-title">Usually within 24 hours</p>
          </div>

          <div className="side-block">
            <p className="side-label">Time zone</p>
            <p className="side-title">WAT (UTC+1), Nigeria</p>
          </div>

          <div className="side-block">
            <p className="side-label">Best way to reach me</p>
            <p className="side-title">Email or WhatsApp</p>
          </div>
        </div>
      </div>
    </section>
  )
}
