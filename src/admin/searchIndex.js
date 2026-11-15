import { getContent } from './api.js'

// What the search looks through: your posts, drafts, projects, skills and testimonials,
// plus the sections and a few actions. Content is read once a minute at most.
let cached = null
const FRESH_MS = 60 * 1000

export function resetSearchIndex() {
  cached = null
}

export async function loadSearchIndex() {
  if (cached && Date.now() - cached.at < FRESH_MS) return cached.value
  const read = (type) => getContent(type, { optional: true }).then((r) => (Array.isArray(r.data) ? r.data : [])).catch(() => [])
  const [posts, drafts, projects, skills, testimonials] = await Promise.all(['posts', 'drafts', 'projects', 'skills', 'testimonials'].map(read))
  const value = { posts, drafts, projects, skills, testimonials }
  cached = { at: Date.now(), value }
  return value
}

// A flat list of things to find. `run` names what happens on choosing it.
export function buildItems({ posts = [], drafts = [], projects = [], skills = [], testimonials = [] }, sections, actions = []) {
  const items = []
  items.push(...actions.map((a) => ({ group: 'Actions', ...a })))
  items.push(...sections.map((s) => ({ group: 'Sections', label: s.label, sub: s.blurb, tab: s.id, words: s.label })))
  for (const p of posts) items.push({ group: 'Posts', label: p.title || 'Untitled post', sub: `Post${p.publishedAt ? ' · ' + String(p.publishedAt).slice(0, 10) : ''}`, tab: 'posts', slug: p.slug, words: `${p.title || ''} ${p.slug || ''} ${(p.tags || []).join(' ')} ${p.excerpt || ''}` })
  for (const p of drafts) items.push({ group: 'Posts', label: p.title || 'Untitled draft', sub: 'Draft', tab: 'posts', slug: p.slug, words: `${p.title || ''} ${p.slug || ''} ${(p.tags || []).join(' ')} draft` })
  projects.forEach((p, index) => items.push({ group: 'Projects', label: p.name || 'Untitled project', sub: `Project${p.hidden ? ' · hidden' : ''}`, tab: 'projects', index, words: `${p.name || ''} ${(p.tags || []).join(' ')} ${p.description || ''}` }))
  skills.forEach((s) => items.push({ group: 'Skills', label: s.name || 'Skill', sub: `Skill${s.hidden ? ' · hidden' : ''}`, tab: 'skills', words: s.name || '' }))
  testimonials.forEach((t) => items.push({ group: 'Testimonials', label: t.author || 'Testimonial', sub: 'Testimonial', tab: 'testimonials', words: `${t.author || ''} ${t.role || ''} ${t.quote || ''}` }))
  return items
}

const GROUP_ORDER = ['Actions', 'Sections', 'Posts', 'Projects', 'Skills', 'Testimonials']

// Every word typed must appear somewhere; a title that starts with it, or a word that
// starts with it, ranks higher. With nothing typed, the actions and sections show.
export function searchItems(items, query, limit = 40) {
  const words = String(query || '').toLowerCase().split(/\s+/).filter(Boolean)
  if (!words.length) return items.filter((i) => i.group === 'Actions' || i.group === 'Sections')
  const scored = []
  for (const item of items) {
    const label = item.label.toLowerCase()
    const hay = `${label} ${String(item.words || '').toLowerCase()}`
    let score = 0
    let all = true
    for (const w of words) {
      if (label.startsWith(w)) score += 6
      else if (label.includes(` ${w}`)) score += 4
      else if (label.includes(w)) score += 3
      else if (hay.includes(` ${w}`)) score += 2
      else if (hay.includes(w)) score += 1
      else {
        all = false
        break
      }
    }
    if (all) scored.push({ item, score })
  }
  scored.sort((a, b) => b.score - a.score || GROUP_ORDER.indexOf(a.item.group) - GROUP_ORDER.indexOf(b.item.group))
  return scored.slice(0, limit).map((s) => s.item)
}
