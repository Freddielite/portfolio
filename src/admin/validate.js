// Checks content before it is saved, so a typo cannot publish a broken page.
// Each function returns a list of plain-English problems (empty means fine).
const isUrl = (v) => {
  try {
    const u = new URL(v)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}
const urlProblem = (label, v, out) => {
  if (v && !isUrl(v)) out.push(`${label} must be a full web address starting with https://`)
}
const isDay = (v) => /^\d{4}-\d{2}-\d{2}$/.test(String(v || '').slice(0, 10)) && !Number.isNaN(Date.parse(String(v).slice(0, 10)))

export function validateProjects(list) {
  const out = []
  list.forEach((p, i) => {
    const label = p.name ? `Project "${p.name}"` : `Project ${i + 1}`
    if (!String(p.name || '').trim()) out.push(`${label} needs a name.`)
    urlProblem(`${label}: Live site URL`, p.live, out)
    urlProblem(`${label}: GitHub URL`, p.github, out)
  })
  return out
}

export function validateSkills(list) {
  const out = []
  list.forEach((s, i) => {
    const label = s.name ? `Skill "${s.name}"` : `Skill ${i + 1}`
    if (!String(s.name || '').trim()) out.push(`${label} needs a name.`)
    if (typeof s.level !== 'number' || Number.isNaN(s.level) || s.level < 0 || s.level > 100) {
      out.push(`${label}: level must be a number from 0 to 100.`)
    }
  })
  return out
}

export function validateTestimonials(list) {
  const out = []
  list.forEach((t, i) => {
    if (!String(t.quote || '').trim()) out.push(`Testimonial ${i + 1} needs a quote.`)
  })
  return out
}

export function validatePosts(list) {
  const out = []
  const seen = new Map()
  list.forEach((p, i) => {
    const label = p.title ? `Post "${p.title}"` : `Post ${i + 1}`
    if (!String(p.title || '').trim()) out.push(`${label} needs a title.`)
    if (!String(p.slug || '').trim()) out.push(`${label} needs a slug (the web address).`)
    else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(p.slug)) out.push(`${label}: slug can only use lowercase letters, numbers and dashes.`)
    else if (seen.has(p.slug)) out.push(`${label}: slug "${p.slug}" is already used by another post.`)
    seen.set(p.slug, true)
    if (!isDay(p.publishedAt)) out.push(`${label} needs a valid date.`)
  })
  return out
}

export function validateSettings(form) {
  const out = []
  if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) out.push('Email does not look right.')
  ;[
    ['GitHub URL', form.githubUrl],
    ['LinkedIn URL', form.linkedinUrl],
    ['Twitter/X URL', form.twitterUrl],
    ['WhatsApp URL', form.whatsappUrl],
    ['Pulse API URL', form.pulseApiUrl],
  ].forEach(([label, v]) => urlProblem(label, v, out))
  if (!form.siteUrl) out.push('Site URL is required (for example https://portfolio.wyntek.xyz).')
  else if (!isUrl(form.siteUrl)) out.push('Site URL must start with https://')
  else if (/\/$/.test(form.siteUrl)) out.push('Site URL should not end with a slash.')
  if (form.pulseApiUrl && !String(form.pulseStatusToken || '').trim()) out.push('Pulse: add the status page token too, or clear the API URL.')
  if (!form.pulseApiUrl && String(form.pulseStatusToken || '').trim()) out.push('Pulse: add the API URL too, or clear the token.')
  return out
}
