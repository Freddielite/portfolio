import { createClient } from '@sanity/client'

// These come from a .env file (see .env.example). Until you connect a real
// Sanity project, isSanityConfigured is false and every page falls back to
// the static files in src/data/ — so the site works out of the box.
const projectId = import.meta.env.VITE_SANITY_PROJECT_ID
const dataset = import.meta.env.VITE_SANITY_DATASET || 'production'

export const isSanityConfigured = Boolean(projectId)

export const sanityClient = isSanityConfigured
  ? createClient({
      projectId,
      dataset,
      apiVersion: '2024-01-01',
      useCdn: true,
    })
  : null

// Builds a usable image URL from a Sanity image reference without pulling in
// the full @sanity/image-url package.
export function urlForImage(source) {
  if (!source) return null
  if (typeof source === 'string') return source
  const ref = source.asset?._ref
  if (!ref || !projectId) return null
  const [, id, dimensions, format] = ref.split('-')
  return `https://cdn.sanity.io/images/${projectId}/${dataset}/${id}-${dimensions}.${format}`
}
