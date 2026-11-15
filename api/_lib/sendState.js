// The server's copy of src/admin/sendState.js (the admin screen and the phone alerts must agree on
// what "stuck" means). A test keeps the two identical. Only the decision lives here, not the wording.
export const STUCK_AFTER_MS = 10 * 60 * 1000

export function sendState(sent, now = Date.now()) {
  if (!sent) return { kind: 'none', retry: false }
  const failed = Number(sent.failed) || 0
  const waiting = Number(sent.waiting) || 0
  const started = new Date(sent.at).getTime()
  const age = Number.isFinite(started) ? now - started : 0

  if (sent.status === 'sending') {
    if (failed > 0 || age > STUCK_AFTER_MS) return { kind: 'stuck', retry: true, failed, waiting }
    return { kind: 'sending', retry: false, failed, waiting }
  }
  if (sent.status === 'sent') {
    if (failed > 0) return { kind: 'partial', retry: true, failed, waiting }
    return { kind: 'sent', retry: false, failed, waiting }
  }
  return { kind: 'other', retry: false, failed, waiting }
}
