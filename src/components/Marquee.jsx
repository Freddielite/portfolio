export const TOOLS = ['React', 'Node.js', 'Go', 'Django', 'PostgreSQL', 'Docker', 'Linux', 'Networking', 'Security']

export default function Marquee() {
  const row = [...TOOLS, ...TOOLS]
  return (
    <div className="marquee" aria-hidden="true">
      <div className="marquee-track">
        {row.map((t, i) => <span key={i}>{t}</span>)}
      </div>
    </div>
  )
}
