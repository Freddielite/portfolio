const LABEL = { up: 'Online', degraded: 'Slow', down: 'Down' }

function ago(iso) {
  if (!iso) return ''
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
  return mins < 1 ? 'just now' : `${mins} min ago`
}

// Small live-status pill from Pulse. Renders nothing without data.
export default function StatusChip({ status, detail = false }) {
  if (!status) return null
  const title = [
    `${LABEL[status.status]} when last checked ${ago(status.checkedAt)}`,
    status.uptime30 != null ? `${status.uptime30}% uptime over 30 days` : '',
    'Monitored by Pulse',
  ].filter(Boolean).join(' · ')

  return (
    <span className={`status-chip is-${status.status}`} title={title}>
      <i className="status-chip-dot" aria-hidden="true" />
      {LABEL[status.status]}
      {status.status !== 'down' && status.ms != null && <span className="status-chip-ms"> · {status.ms} ms</span>}
      {detail && status.uptime30 != null && <span className="status-chip-ms"> · {status.uptime30}% 30d</span>}
    </span>
  )
}
