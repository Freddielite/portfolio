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

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48)
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
      _id: `project-${slugify(p.name)}`,
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
    _id: `skill-${slugify(s.name)}`,
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

async function pruneRemoved(allDocs) {
  // Deletes any project/post/testimonial/skill document in Sanity that is
  // no longer present in src/data/*.js — e.g. a project you deleted here
  // (like removing Shefitts) actually disappears from Sanity too, instead
  // of lingering as an orphaned duplicate.
  const keepIds = new Set(allDocs.map((d) => d._id))
  const types = ['project', 'post', 'testimonial', 'skill']
  const existing = await client.fetch(
    `*[_type in $types]{ _id, _type, name, title, author }`,
    { types }
  )
  const toDelete = existing.filter((doc) => !keepIds.has(doc._id))

  if (toDelete.length === 0) return

  console.log(`\n[seed] Removing ${toDelete.length} document(s) no longer in src/data/:`)
  let tx = client.transaction()
  for (const doc of toDelete) {
    const label = doc.name || doc.title || doc.author || doc._id
    console.log(`  - ${doc._type}: ${label} (${doc._id})`)
    tx = tx.delete(doc._id)
  }
  await tx.commit()
}

async function run() {
  const [projectDocs, skillDocs, testimonialDocs, postDocs, settingsDocs] = await Promise.all([
    seedProjects(),
    Promise.resolve(seedSkills()),
    Promise.resolve(seedTestimonials()),
    seedPosts(),
    Promise.resolve(seedSiteSettings()),
  ])

  const syncedDocs = [...projectDocs, ...skillDocs, ...testimonialDocs, ...postDocs]
  const allDocs = [...settingsDocs, ...syncedDocs]

  console.log(`[seed] Prepared ${allDocs.length} documents:`)
  console.log(`  - 1 site settings`)
  console.log(`  - ${projectDocs.length} project(s)`)
  console.log(`  - ${skillDocs.length} skill(s)`)
  console.log(`  - ${testimonialDocs.length} testimonial(s)`)
  console.log(`  - ${postDocs.length} blog post(s)`)

  if (DRY_RUN) {
    console.log('\n[seed] --dry-run: no writes made. Document IDs that would be created:')
    allDocs.forEach((d) => console.log(`  - ${d._id}`))
    console.log(
      '\n[seed] Note: "Site settings" only gets created if missing — it will never overwrite edits made in the Studio on future runs.'
    )
    return
  }

  // Site settings: only create it if it doesn't exist yet. Once it exists,
  // the Studio is the source of truth for it — re-running this script
  // should never silently reset a toggle (like "Show testimonials section")
  // or bio text you've since edited there.
  let settingsTx = client.transaction()
  for (const doc of settingsDocs) {
    settingsTx = settingsTx.createIfNotExists(doc)
  }
  await settingsTx.commit()

  // Everything else: always sync from src/data/, since these are meant to
  // be kept up to date by re-running this script.
  let tx = client.transaction()
  for (const doc of syncedDocs) {
    tx = tx.createOrReplace(doc)
  }
  await tx.commit()

  await pruneRemoved(syncedDocs)

  console.log('\n[seed] Done! Open your Studio — everything should be there now.')
}

run().catch((err) => {
  console.error('[seed] Failed:', err.message)
  process.exit(1)
})
