// Shared helper for the build scripts. Deliberately plain Node/ESM (no Vite
// env handling) so this can run as a plain "node scripts/x.mjs" step.
// Content is local JSON, the same files the admin panel at /admin edits, so
// a build always reflects exactly what was last saved there.
//
// Loaded via createRequire (not a plain `import './x.json'`) so this works
// on any Node version without relying on the newer import-attribute syntax.
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)

import { isLivePost } from '../src/lib/postStatus.js'

const allPosts = require('../content/posts.json')
const projects = require('../content/projects.json').filter((p) => !p.hidden)
const settings = require('../content/siteSettings.json')

// Same rule as the site: no drafts, nothing dated in the future.
const posts = allPosts.filter((p) => isLivePost(p))

export async function getBuildTimeContent() {
  return { posts, projects, settings }
}
