import { useRef } from 'react'

export default function ProfileCard() {
  const tiltRef = useRef(null)

  function handleMouseMove(e) {
    const el = tiltRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const px = (e.clientX - rect.left) / rect.width
    const py = (e.clientY - rect.top) / rect.height
    const rotateY = (px - 0.5) * 16
    const rotateX = (0.5 - py) * 16
    el.style.transition = 'transform 0.05s linear'
    el.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`
  }

  function handleMouseLeave() {
    const el = tiltRef.current
    if (!el) return
    el.style.transition = 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)'
    el.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg)'
  }

  return (
    <div className="network-card profile-card">
      <div
        className="profile-tilt"
        ref={tiltRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <div className="network-card-header">
          <span className="network-card-title">WILFRED / PROFILE</span>
          <span className="network-card-status">
            <span className="status-dot" /> AVAILABLE FOR WORK
          </span>
        </div>

        <div className="profile-card-body">
          <div className="profile-photo-frame">
            <img
              src="/images/wilfred-photo.jpg"
              alt="Oseghale Wilfred"
              className="profile-photo"
            />
            <span className="reticle-corner tl" />
            <span className="reticle-corner tr" />
            <span className="reticle-corner bl" />
            <span className="reticle-corner br" />
          </div>
        </div>
      </div>
    </div>
  )
}
