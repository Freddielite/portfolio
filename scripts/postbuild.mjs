// Runs after `vite build`. Two jobs, both aimed at SEO on a client-rendered
// SPA:
//   1. Write dist/sitemap.xml and dist/robots.txt from the current content.
//   2. Write a per-post dist/blog/<slug>/index.html with the right
//      <title>/description/OG tags baked in, so link previews on
//      Twitter/LinkedIn/WhatsApp/etc. (which don't run JS) show real post
//      titles and images instead of the homepage default. The file still
//      loads the same JS bundle, so once a browser opens it React Router
//      takes over normally.
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { getBuildTimeContent } from './lib.mjs'

const DIST = path.resolve('dist')

function escapeHtml(str = '') {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

async function writeSitemapAndRobots(posts, projects, siteUrl) {
  const base = siteUrl.replace(/\/$/, '')
  const staticRoutes = ['/', '/blog', '/changelog']
  const urls = [
    ...staticRoutes.map((r) => `${base}${r}`),
    ...posts.map((p) => `${base}/blog/${p.slug}`),
  ]
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${u}</loc></url>`).join('\n')}
</urlset>
`
  await writeFile(path.join(DIST, 'sitemap.xml'), xml)
  await writeFile(
    path.join(DIST, 'robots.txt'),
    `User-agent: *\nAllow: /\nSitemap: ${base}/sitemap.xml\n`
  )
  console.log(`[postbuild] wrote sitemap.xml with ${urls.length} URLs`)
}

async function writePostHtml(template, post, siteUrl) {
  const base = siteUrl.replace(/\/$/, '')
  const title = `${escapeHtml(post.title)} · ${escapeHtml('Oseghale Wilfred')}`
  const description = escapeHtml(post.excerpt || '')
  const image = post.coverImage
    ? (post.coverImage.startsWith('http') ? post.coverImage : `${base}${post.coverImage}`)
    : `${base}/images/wilfred-photo.jpg`
  const url = `${base}/blog/${post.slug}`

  let html = template
  html = html.replace(/<title>.*?<\/title>/, `<title>${title}</title>`)
  html = html.replace(/<meta name="description" content=".*?"\s*\/>/, `<meta name="description" content="${description}" />`)
  html = html.replace(/<meta property="og:title" content=".*?"\s*\/>/, `<meta property="og:title" content="${title}" />`)
  html = html.replace(/<meta property="og:description" content=".*?"\s*\/>/, `<meta property="og:description" content="${description}" />`)
  html = html.replace(/<meta property="og:image" content=".*?"\s*\/>/, `<meta property="og:image" content="${image}" />`)
  html = html.replace(/<meta property="og:type" content=".*?"\s*\/>/, `<meta property="og:type" content="article" />`)
  html += `` // no-op, keeps structure readable
  html = html.replace('</head>', `  <link rel="canonical" href="${url}" />\n</head>`)

  const outDir = path.join(DIST, 'blog', post.slug)
  await mkdir(outDir, { recursive: true })
  await writeFile(path.join(outDir, 'index.html'), html)
}

async function run() {
  const { posts, projects, settings } = await getBuildTimeContent()
  const template = await readFile(path.join(DIST, 'index.html'), 'utf-8')

  await writeSitemapAndRobots(posts, projects, settings.siteUrl)

  for (const post of posts) {
    await writePostHtml(template, post, settings.siteUrl)
  }
  console.log(`[postbuild] pre-rendered SEO tags for ${posts.length} blog post(s)`)
}

run().catch((err) => {
  console.error('[postbuild] failed:', err)
  process.exitCode = 1
})
