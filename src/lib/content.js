// Content lives directly in src/data/*.json now — no external CMS, no
// network fetch, no CORS/env var configuration required. The admin panel at
// /admin edits these same JSON files by committing straight to GitHub, which
// triggers a normal Vercel redeploy so changes go live.
import projects from '../data/projects.js'
import skills from '../data/skills.js'
import settings from '../data/siteSettings.js'
import testimonials from '../data/testimonials.js'
import posts from '../data/posts.js'

export function getProjects() {
  return projects
}

export function getSkills() {
  return skills
}

export function getSiteSettings() {
  return settings
}

export function getTestimonials() {
  return testimonials
}

export function getPosts() {
  return [...posts].sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
}

export function getPostBySlug(slug) {
  return posts.find((p) => p.slug === slug) || null
}
