import { postState } from '../lib/postStatus.js'

// Bulk actions on the posts list. They only change the list on screen; nothing is on the
// site until the usual Save (which writes posts and drafts in one commit).

export function setStatus(list, ids, status) {
  const set = new Set(ids)
  return list.map((p) => (set.has(p._id) && p.status !== status ? { ...p, status } : p))
}

// For Undo: each picked post's status before.
export const statusesOf = (list, ids) => new Map(list.filter((p) => ids.includes(p._id)).map((p) => [p._id, p.status]))
export const restoreStatuses = (list, prev) => list.map((p) => (prev.has(p._id) ? { ...p, status: prev.get(p._id) } : p))

export function removeMany(list, ids) {
  const set = new Set(ids)
  const removed = []
  list.forEach((p, at) => set.has(p._id) && removed.push({ post: p, at }))
  return { list: list.filter((p) => !set.has(p._id)), removed }
}

// Puts deleted posts back where they were (skipping any that are already back).
export function restoreMany(list, removed) {
  const out = [...list]
  for (const { post, at } of [...removed].sort((a, b) => a.at - b.at)) {
    if (!out.some((p) => p._id === post._id)) out.splice(Math.min(at, out.length), 0, post)
  }
  return out
}

// "Published 3 posts, 1 scheduled for later" for the toast.
export function publishSummary(list, ids) {
  const picked = list.filter((p) => ids.includes(p._id))
  const scheduled = picked.filter((p) => postState(p) === 'scheduled').length
  const n = picked.length
  return `Published ${n} post${n === 1 ? '' : 's'}${scheduled ? `, ${scheduled} scheduled for later` : ''}`
}
