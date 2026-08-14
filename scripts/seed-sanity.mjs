// One-time (or re-runnable) import: copies everything currently in
// src/data/*.js into your Sanity project, so the Studio starts populated
// with your real content instead of empty. Safe to re-run — it uses fixed
// document IDs and createOrReplace, so running it twice just updates the
// same documents instead of duplicating them.
//
// Usage:
//   node scripts/seed-sanity.mjs            (writes to Sanity)
//   node scripts/seed-sanity.mjs --dry-run   (prints what it would do, no writes)
//
// Requires a .env file in the project root with:
//   VITE_SANITY_PROJECT_ID=...
//   VITE_SANITY_DATASET=production
//   SANITY_API_TOKEN=...   (see README below this script for how to get one)

import 'dotenv/config'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { createClient } from '@sanity/client'

import projects from '../src/data/projects.js'
import skills from '../src/data/skills.js'
import testimonials from '../src/data/testimonials.js'
import posts from '../src/data/posts.js'
import siteSettings from '../src/data/siteSettings.js'

const DRY_RUN = process.argv.includes('--dry-run')

const projectId = process.env.VITE_SANITY_PROJECT_ID
const dataset = process.env.VITE_SANITY_DATASET || 'production'
const token = process.env.SANITY_API_TOKEN

if (!DRY_RUN && (!projectId || !token)) {
  console.error(
    '[seed] Missing VITE_SANITY_PROJECT_ID or SANITY_API_TOKEN in .env — see studio/README.md "Importing your existing content" section.'
  )
  process.exit(1)
}

const client = DRY_RUN
  ? null
  : createClient({ projectId, dataset, token, apiVersion: '2024-01-01', useCdn: false })

let uploadedAssetCache = {}

async function uploadImage(publicPath) {
  if (!publicPath) return null
  if (DRY_RUN) return { _type: 'image', asset: { _type: 'reference', _ref: `dry-run-${publicPath}` } }
  if (uploadedAssetCache[publicPath]) return uploadedAssetCache[publicPath]

  const filePath = path.resolve('public', publicPath.replace(/^\//, ''))
  const buffer = await readFile(filePath)
  const asset = await client.assets.upload('image', buffer, {
    filename: path.basename(filePath),
  })
  const imageField = { _type: 'image', asset: { _type: 'reference', _ref: asset._id } }
  uploadedAssetCache[publicPath] = imageField
  return imageField
}

function key() {
  return Math.random().toString(36).slice(2, 10)
}

function toPortableText(body) {
  // Fallback posts are already shaped like Portable Text blocks, minus the
  // _key fields Sanity requires on every block/span. Add those here.
  return body.map((block) => ({
    ...block,
    _key: key(),
    children: block.children?.map((child) => ({ ...child, _key: key() })),
  }))
}

async function seedProjects() {
  const docs = []
  for (const [i, p] of projects.entries()) {
    const image = await uploadImage(p.image)
    docs.push({
      _id: `project-${p.id}`,
      _type: 'project',
      order: i,
      id: p.id,
      name: p.name,
      description: p.description,
      tags: p.tags,
      live: p.live || undefined,
      github: p.github || undefined,
      image: image || undefined,
      caseStudy: p.caseStudy,
    })
  }
  return docs
}

function seedSkills() {
  return skills.map((s, i) => ({
    _id: `skill-${i}-${s.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)}`,
    _type: 'skill',
    order: i,
    name: s.name,
    level: s.level,
  }))
}

function seedTestimonials() {
  return testimonials.map((t, i) => ({
    _id: `testimonial-${t.id}`,
    _type: 'testimonial',
    order: i,
    quote: t.quote,
    author: t.author,
    role: t.role,
  }))
}

async function seedPosts() {
  const docs = []
  for (const p of posts) {
    const coverImage = await uploadImage(p.coverImage)
    docs.push({
      _id: `post-${p.slug}`,
      _type: 'post',
      title: p.title,
      slug: { _type: 'slug', current: p.slug },
      excerpt: p.excerpt,
      publishedAt: new Date(p.publishedAt).toISOString(),
      coverImage: coverImage || undefined,
      body: toPortableText(p.body),
    })
  }
  return docs
}

function seedSiteSettings() {
  return [{ _id: 'siteSettings', _type: 'siteSettings', ...siteSettings }]
}

async function run() {
  const [projectDocs, skillDocs, testimonialDocs, postDocs, settingsDocs] = await Promise.all([
    seedProjects(),
    Promise.resolve(seedSkills()),
    Promise.resolve(seedTestimonials()),
    seedPosts(),
    Promise.resolve(seedSiteSettings()),
  ])

  const allDocs = [...settingsDocs, ...projectDocs, ...skillDocs, ...testimonialDocs, ...postDocs]

  console.log(`[seed] Prepared ${allDocs.length} documents:`)
  console.log(`  - 1 site settings`)
  console.log(`  - ${projectDocs.length} project(s)`)
  console.log(`  - ${skillDocs.length} skill(s)`)
  console.log(`  - ${testimonialDocs.length} testimonial(s)`)
  console.log(`  - ${postDocs.length} blog post(s)`)

  if (DRY_RUN) {
    console.log('\n[seed] --dry-run: no writes made. Document IDs that would be created:')
    allDocs.forEach((d) => console.log(`  - ${d._id}`))
    return
  }

  let tx = client.transaction()
  for (const doc of allDocs) {
    tx = tx.createOrReplace(doc)
  }
  await tx.commit()

  console.log('\n[seed] Done! Open your Studio — everything should be there now.')
}

run().catch((err) => {
  console.error('[seed] Failed:', err.message)
  process.exit(1)
})
