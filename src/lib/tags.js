// Tags for blog posts. A post can carry its own `tags` array (set in /admin).
// Posts without one get tags worked out from their title and excerpt, so older
// posts are grouped without anyone having to edit them.
const RULES = [
  ['Infrastructure', /uptime|monitor|free-tier|awake|hosting|server|goes down|infrastructure|layers|deploy/i],
  ['Backend', /backend|\bapi\b|\bauth\b|django|\bgo\b|database|queue|postgres/i],
  ['Security', /security|secure|\bauth\b|spam|consent/i],
  ['Email', /email|newsletter|inbox|deliverab/i],
  ['Mobile', /apk|android|push|reminder|pwa|download site/i],
  ['Frontend', /frontend|checkout|storefront|interface|react/i],
  ['Commerce', /checkout|shopper|store|payment/i],
  ['Business', /retainer|one-off|scop/i],
  ['Productivity', /focus|productivity|deadline/i],
  ['Client work', /\bclient/i, 'title'],
]

export function postTags(post) {
  if (Array.isArray(post.tags) && post.tags.length) return post.tags
  const both = `${post.title || ''} ${post.excerpt || ''}`
  return RULES
    .filter(([, re, where]) => re.test(where === 'title' ? post.title || '' : both))
    .map(([tag]) => tag)
    .slice(0, 3)
}

export function allTags(posts) {
  const counts = new Map()
  posts.forEach((p) => postTags(p).forEach((t) => counts.set(t, (counts.get(t) || 0) + 1)))
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
}

// Related posts: most shared tags first, then the most recent.
export function relatedPosts(current, posts, limit = 3) {
  const mine = new Set(postTags(current))
  return posts
    .filter((p) => p.slug !== current.slug)
    .map((p) => ({ p, score: postTags(p).filter((t) => mine.has(t)).length }))
    .sort((a, b) => b.score - a.score || new Date(b.p.publishedAt) - new Date(a.p.publishedAt))
    .slice(0, limit)
    .map((x) => x.p)
}
