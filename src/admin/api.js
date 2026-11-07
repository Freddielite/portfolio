import { adminFetch } from './http.js'
// Small helpers for talking to the admin content API outside the editors
// (the overview page, backup and restore).
export async function getContent(type, { optional = false } = {}) {
  const res = await adminFetch(`/api/admin/content?type=${type}`, { cache: 'no-store' })
  const body = await res.json().catch(() => ({}))
  if (res.status === 404 && optional) return { data: [], sha: null }
  if (!res.ok) throw new Error(body.error || `Could not load ${type}.`)
  return body
}

export async function putContent(type, data, sha) {
  const res = await adminFetch(`/api/admin/content?type=${type}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data, sha }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.error || `Could not save ${type}.`)
  return body
}

export const CONTENT_TYPES = ['siteSettings', 'projects', 'skills', 'testimonials', 'posts', 'drafts']

// Combine a backup with what is already there, adding only what is missing.
export function mergeContent(type, current, incoming) {
  if (type === 'siteSettings') return { ...incoming, ...current }
  const idOf = {
    posts: (x) => x.slug,
    drafts: (x) => x.slug,
    projects: (x) => String(x.name || '').toLowerCase(),
    skills: (x) => String(x.name || '').toLowerCase(),
    testimonials: (x) => x.id || String(x.quote || '').slice(0, 60),
  }[type]
  const have = new Set(current.map(idOf))
  return [...current, ...incoming.filter((x) => !have.has(idOf(x)))]
}

export const countOf = (type, data) => (type === 'siteSettings' ? Object.keys(data || {}).length : (data || []).length)
