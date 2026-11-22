import { postTags } from '../lib/tags.js'

// Renaming and merging tags across every post (published and drafts). Pure functions, so
// the rules are easy to test. A post that has no tags of its own gets them worked out from
// its title and summary (lib/tags.js), so renaming such a tag gives those posts their own tags.

const hasOwnTags = (p) => Array.isArray(p.tags) && p.tags.length > 0

export const cleanTag = (s) =>
  String(s ?? '')
    .trim()
    .replace(/^#+\s*/, '')
    .replace(/\s+/g, ' ')

// [[tag, number of posts], ...], the most used first.
export function tagCounts(list) {
  const counts = new Map()
  for (const p of list) for (const t of postTags(p)) counts.set(t, (counts.get(t) || 0) + 1)
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
}

// What renaming `from` to `rawTo` would do. Where the new name goes, in this order:
//   1. exactly the tag's own name: nothing to do
//   2. a tag that already has exactly that spelling: merge into it
//   3. a tag with that spelling apart from capitals ("backend" -> the existing "Backend"): merge into it
//   4. otherwise a plain rename (this includes changing only the capitals of the tag's own name)
export function planRename(list, from, rawTo) {
  const typed = cleanTag(rawTo)
  if (!typed) return { ok: false, reason: 'Type a name for the tag.' }
  if (typed === from) return { ok: false, reason: 'That is already its name.' }
  const counts = tagCounts(list)
  const existing =
    counts.find(([t]) => t === typed) || counts.find(([t]) => t !== from && t.toLowerCase() === typed.toLowerCase())
  const to = existing ? existing[0] : typed
  const affected = list.filter((p) => postTags(p).includes(from))
  return {
    ok: true,
    from,
    to,
    merges: !!existing,
    mergeCount: existing ? existing[1] : 0,
    posts: affected.length,
    automatic: affected.filter((p) => !hasOwnTags(p)).length,
  }
}

// Every post that carries `from` now carries `to` instead (once, even if it had both).
export function applyRename(list, from, to) {
  return list.map((p) => {
    const tags = postTags(p)
    if (!tags.includes(from)) return p
    const next = []
    for (const t of tags) {
      const m = t === from ? to : t
      if (!next.some((x) => x.toLowerCase() === m.toLowerCase())) next.push(m)
    }
    return { ...p, tags: next }
  })
}

// For Undo: what each changed post's `tags` field was before.
export function tagsBefore(before, after) {
  const was = new Map(before.map((p) => [p._id, p.tags]))
  return new Map(after.filter((p, i) => p !== before[i]).map((p) => [p._id, was.get(p._id)]))
}
export const restoreTags = (list, prev) => list.map((p) => (prev.has(p._id) ? { ...p, tags: prev.get(p._id) } : p))
