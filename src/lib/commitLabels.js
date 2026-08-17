// Turns a raw git commit message into a human-readable changelog line and a
// category, using plain pattern rules — the same commit messages the admin
// panel writes (see api/_lib/github.js) and whatever convention normal dev
// commits already follow. No AI call needed for this: commit messages are
// short, structured text and a handful of regexes cover them completely.

const CONTENT_TYPE_LABELS = {
  projects: 'projects',
  skills: 'skills',
  testimonials: 'testimonials',
  posts: 'the blog',
  siteSettings: 'site settings',
}

// Order matters — first match wins.
const RULES = [
  {
    category: 'content',
    test: (msg) => /^admin: update (\w+)/.exec(msg),
    describe: (m) => `Updated ${CONTENT_TYPE_LABELS[m[1]] || m[1]}`,
  },
  {
    category: 'content',
    test: (msg) => /^admin: upload image/.exec(msg),
    describe: () => 'Added a new image',
  },
  {
    category: 'content',
    test: (msg) => /^admin: replace public\/cv\.pdf/.exec(msg),
    describe: () => 'Updated résumé',
  },
  {
    category: 'content',
    test: (msg) => /^admin:\s*(.*)/.exec(msg),
    describe: (m) => m[1] || 'Content update',
  },
  {
    category: 'feature',
    test: (msg) => /^feat(\([^)]*\))?:\s*(.*)/i.exec(msg),
    describe: (m) => capitalize(m[2]),
  },
  {
    category: 'fix',
    test: (msg) => /^fix(\([^)]*\))?:\s*(.*)/i.exec(msg),
    describe: (m) => capitalize(m[2]),
  },
  {
    category: 'chore',
    test: (msg) => /^(chore|refactor|style|docs|test|perf|ci|build)(\([^)]*\))?:\s*(.*)/i.exec(msg),
    describe: (m) => capitalize(m[3]),
  },
]

function capitalize(str = '') {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

export function describeCommit(rawMessage) {
  // Only the first line — commit bodies can be long/free-form, not needed
  // for a changelog entry.
  const firstLine = String(rawMessage || '').split('\n')[0].trim()

  for (const rule of RULES) {
    const match = rule.test(firstLine)
    if (match) return { category: rule.category, label: rule.describe(match) }
  }

  return { category: 'other', label: firstLine || 'Update' }
}

export const CATEGORY_LABELS = {
  content: 'Content',
  feature: 'Feature',
  fix: 'Fix',
  chore: 'Chore',
  other: 'Update',
}
