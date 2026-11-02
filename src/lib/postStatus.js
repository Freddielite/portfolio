// A post is live when it is not marked as a draft and its date has arrived.
// Dates are plain YYYY-MM-DD strings, compared by day in the visitor's time zone.
export function todayString(now = new Date()) {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function isLivePost(post, now = new Date()) {
  if (post.status === 'draft') return false
  const day = String(post.publishedAt || '').slice(0, 10)
  return !day || day <= todayString(now)
}

export function postState(post, now = new Date()) {
  if (post.status === 'draft') return 'draft'
  return isLivePost(post, now) ? 'published' : 'scheduled'
}
