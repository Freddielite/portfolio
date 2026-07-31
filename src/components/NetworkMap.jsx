import { Shield, Globe } from 'lucide-react'

export default function NetworkMap() {
  return (
    <div className="network-card" aria-hidden="true">
      <div className="network-card-header">
        <span className="network-card-title">WILFRED / SYSTEM MAP</span>
        <span className="network-card-status">
          <span className="status-dot" /> ALL SYSTEMS UP
        </span>
      </div>

      <div className="network-card-body">
        <svg className="network-lines" viewBox="0 0 100 100" preserveAspectRatio="none">
          <path d="M44 24 L52 24 L52 48 L56 48" />
          <path d="M44 72 L52 72 L52 48 L56 48" />
          <path d="M80 48 L86 48" />
        </svg>

        <div className="map-node map-node-1">
          <span className="map-node-tag"><span className="status-dot" /> NODE 01</span>
          <strong>Frontend</strong>
        </div>

        <div className="map-node map-node-2">
          <span className="map-node-tag"><span className="status-dot" /> NODE 02</span>
          <strong>Backend</strong>
        </div>

        <div className="map-node map-node-center">
          <Shield size={18} />
          <span>SECURITY</span>
        </div>

        <div className="map-node map-node-right">
          <Globe size={15} />
          <span>NETWORK</span>
        </div>
      </div>
    </div>
  )
}
