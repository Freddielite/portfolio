import { sanityClient, isSanityConfigured } from './sanity.js'

import fallbackProjects from '../data/projects.js'
import fallbackSkills from '../data/skills.js'
import fallbackSettings from '../data/siteSettings.js'
import fallbackTestimonials from '../data/testimonials.js'
import fallbackPosts from '../data/posts.js'

async function fetchOrFallback(query, fallback) {
  if (!isSanityConfigured) return fallback
  try {
    const result = await sanityClient.fetch(query)
    if (!result || (Array.isArray(result) && result.length === 0)) return fallback
    return result
  } catch (err) {
    console.warn('Sanity fetch failed, using fallback content:', err.message)
    return fallback
  }
}

export function getProjects() {
  return fetchOrFallback(
    `*[_type == "project"] | order(order asc){
      "id": coalesce(id, _id), name, description, tags, live, github,
      "image": image.asset->url, caseStudy
    }`,
    fallbackProjects
  )
}

export function getSkills() {
  return fetchOrFallback(
    `*[_type == "skill"] | order(order asc){ name, level }`,
    fallbackSkills
  )
}

export async function getSiteSettings() {
  const result = await fetchOrFallback(
    `*[_type == "siteSettings"][0]`,
    null
  )
  // Merge so a partially-filled Sanity document still gets sane defaults.
  return { ...fallbackSettings, ...(result || {}) }
}

export function getTestimonials() {
  return fetchOrFallback(
    `*[_type == "testimonial"] | order(order asc){ "id": _id, quote, author, role }`,
    fallbackTestimonials
  )
}

export async function getPosts() {
  const result = await fetchOrFallback(
    `*[_type == "post"] | order(publishedAt desc){
      "_id": _id, title, "slug": slug.current, excerpt, publishedAt,
      "coverImage": coverImage.asset->url, body
    }`,
    fallbackPosts
  )
  return [...result].sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
}

export async function getPostBySlug(slug) {
  if (isSanityConfigured) {
    try {
      const post = await sanityClient.fetch(
        `*[_type == "post" && slug.current == $slug][0]{
          "_id": _id, title, "slug": slug.current, excerpt, publishedAt,
          "coverImage": coverImage.asset->url, body
        }`,
        { slug }
      )
      if (post) return post
    } catch (err) {
      console.warn('Sanity fetch failed, using fallback content:', err.message)
    }
  }
  return fallbackPosts.find((p) => p.slug === slug) || null
}
