// Shared helpers for the build scripts. Deliberately plain Node/ESM (no Vite
// env handling) so these can run as plain "node scripts/x.mjs" steps.
import fallbackProjects from '../src/data/projects.js'
import fallbackPosts from '../src/data/posts.js'
import fallbackSettings from '../src/data/siteSettings.js'

const projectId = process.env.VITE_SANITY_PROJECT_ID
const dataset = process.env.VITE_SANITY_DATASET || 'production'

export async function getBuildTimeContent() {
  if (!projectId) {
    return { posts: fallbackPosts, projects: fallbackProjects, settings: fallbackSettings }
  }
  try {
    const { createClient } = await import('@sanity/client')
    const client = createClient({ projectId, dataset, apiVersion: '2024-01-01', useCdn: true })
    const [posts, projects, settings] = await Promise.all([
      client.fetch(
        `*[_type == "post"] | order(publishedAt desc){ "slug": slug.current, title, excerpt, publishedAt, "coverImage": coverImage.asset->url }`
      ),
      client.fetch(`*[_type == "project"]{ "id": coalesce(id, _id) }`),
      client.fetch(`*[_type == "siteSettings"][0]{ siteUrl }`),
    ])
    return {
      posts: posts?.length ? posts : fallbackPosts,
      projects: projects?.length ? projects : fallbackProjects,
      settings: { ...fallbackSettings, ...(settings || {}) },
    }
  } catch (err) {
    console.warn('[build] Sanity fetch failed, using fallback content:', err.message)
    return { posts: fallbackPosts, projects: fallbackProjects, settings: fallbackSettings }
  }
}
