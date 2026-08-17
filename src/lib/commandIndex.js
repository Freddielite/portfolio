// Builds the flat, searchable list of command-palette items from whatever
// content is already loaded (site settings, projects, posts). Pure and
// synchronous — no fetching here, so it's cheap to rebuild on every render
// and trivial to reason about.

export function buildCommandItems({ settings, projects, posts }) {
  const items = []

  const sections = [
    { id: 'about', label: 'About', hash: '#about' },
    { id: 'skills', label: 'Skills', hash: '#skills' },
    { id: 'work', label: 'Work', hash: '#work' },
    { id: 'contact', label: 'Contact', hash: '#contact' },
  ]
  for (const s of sections) {
    items.push({
      id: `section-${s.id}`,
      group: 'Navigate',
      label: s.label,
      keywords: s.label,
      kind: 'link',
      to: `/${s.hash}`,
    })
  }

  items.push(
    { id: 'page-blog', group: 'Navigate', label: 'Blog', keywords: 'blog writing posts', kind: 'link', to: '/blog' },
    { id: 'page-changelog', group: 'Navigate', label: 'Changelog', keywords: 'changelog history commits build log', kind: 'link', to: '/changelog' }
  )

  for (const p of projects || []) {
    items.push({
      id: `project-${p.id}`,
      group: 'Projects',
      label: p.name,
      sublabel: (p.tags || []).join(', '),
      keywords: `${p.name} ${(p.tags || []).join(' ')} ${p.description || ''}`,
      kind: 'link',
      to: '/#work',
    })
  }

  for (const post of posts || []) {
    items.push({
      id: `post-${post._id}`,
      group: 'Blog',
      label: post.title,
      sublabel: post.excerpt,
      keywords: `${post.title} ${post.excerpt || ''}`,
      kind: 'link',
      to: `/blog/${post.slug}`,
    })
  }

  items.push({
    id: 'action-theme',
    group: 'Actions',
    label: 'Toggle light / dark theme',
    keywords: 'theme dark light mode toggle',
    kind: 'toggle-theme',
  })

  if (settings.resumeUrl) {
    items.push({
      id: 'action-cv',
      group: 'Actions',
      label: 'Download CV',
      keywords: 'cv resume download pdf',
      kind: 'download-cv',
    })
  }

  if (settings.email) {
    items.push({
      id: 'action-email',
      group: 'Actions',
      label: `Copy email — ${settings.email}`,
      keywords: 'email copy contact reach',
      kind: 'copy-email',
    })
  }

  if (settings.githubUrl) {
    items.push({ id: 'external-github', group: 'Elsewhere', label: 'GitHub', keywords: 'github code repos', kind: 'external', href: settings.githubUrl })
  }
  if (settings.linkedinUrl) {
    items.push({ id: 'external-linkedin', group: 'Elsewhere', label: 'LinkedIn', keywords: 'linkedin', kind: 'external', href: settings.linkedinUrl })
  }
  if (settings.whatsappUrl) {
    items.push({ id: 'external-whatsapp', group: 'Elsewhere', label: 'WhatsApp', keywords: 'whatsapp message chat', kind: 'external', href: settings.whatsappUrl })
  }
  if (settings.twitterUrl) {
    items.push({ id: 'external-twitter', group: 'Elsewhere', label: 'Twitter / X', keywords: 'twitter x', kind: 'external', href: settings.twitterUrl })
  }

  return items
}
