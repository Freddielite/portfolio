// Where one emailed post stands, worked out from its Wynmail campaign. Pure, so it is easy to test.
// Wynmail says "sending" until every email has either gone out or finally failed, so a campaign
// that has been "sending" for a long time, or has failures, is not really sending: it needs a retry.
export const STUCK_AFTER_MS = 10 * 60 * 1000

export function sendState(sent, now = Date.now()) {
  if (!sent) return { kind: 'none', retry: false }
  const failed = Number(sent.failed) || 0
  const waiting = Number(sent.waiting) || 0
  const started = new Date(sent.at).getTime()
  const age = Number.isFinite(started) ? now - started : 0

  if (sent.status === 'sending') {
    if (failed > 0 || age > STUCK_AFTER_MS) return { kind: 'stuck', badge: 'Stuck', badgeClass: 'is-warn', retry: true, failed, waiting }
    return { kind: 'sending', badge: 'Sending', badgeClass: 'admin-badge-building', retry: false, failed, waiting }
  }
  if (sent.status === 'sent') {
    if (failed > 0) return { kind: 'partial', badge: 'Needs retry', badgeClass: 'is-warn', retry: true, failed, waiting }
    return { kind: 'sent', badge: 'Sent', badgeClass: 'is-published', retry: false, failed, waiting }
  }
  // held for review, paused, draft: Wynmail has the say, so it is only shown.
  const label = String(sent.status || 'unknown')
  return { kind: 'other', badge: label.charAt(0).toUpperCase() + label.slice(1), badgeClass: 'is-draft', retry: false, failed, waiting }
}

// The line under the post title.
export function sendLine(state, sent, { ago, day }) {
  const n = Number(sent.sent) || 0
  if (state.kind === 'sending') return `Sending since ${ago} · ${n} sent so far`
  if (state.kind === 'stuck') {
    return [`Not finished ${ago}`, `${n} sent`, state.failed ? `${state.failed} failed` : '', state.waiting ? `${state.waiting} waiting` : ''].filter(Boolean).join(' · ')
  }
  if (state.kind === 'partial') return `Emailed ${day} · ${n} sent · ${state.failed} did not go out`
  if (state.kind === 'other') return `${state.badge} · ${n} sent so far`
  return `Emailed ${day} · ${n} sent · ${sent.opened} opened · ${sent.clicked} clicked`
}
