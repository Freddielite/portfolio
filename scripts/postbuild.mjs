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
import { postTags } from '../src/lib/tags.js'

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
  const staticRoutes = ['/', '/blog']
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

async function writePostHtml(template, post, siteUrl, ogMade = new Set()) {
  const base = siteUrl.replace(/\/$/, '')
  const title = `${escapeHtml(post.title)} · ${escapeHtml('Oseghale Wilfred')}`
  const description = escapeHtml(post.excerpt || '')
  // A generated title card per post (see makeOgImages). Falls back to the
  // post's own cover image, then to the site-wide card.
  const image = ogMade.has(post.slug)
    ? `${base}/og/${post.slug}.png`
    : post.coverImage
      ? (post.coverImage.startsWith('http') ? post.coverImage : `${base}${post.coverImage}`)
      : `${base}/images/og-card.jpg`
  const url = `${base}/blog/${post.slug}`

  let html = template
  html = html.replace(/<title>.*?<\/title>/, `<title>${title}</title>`)
  html = html.replace(/<meta name="description" content=".*?"\s*\/>/, `<meta name="description" content="${description}" />`)
  html = html.replace(/<meta property="og:title" content=".*?"\s*\/>/, `<meta property="og:title" content="${title}" />`)
  html = html.replace(/<meta property="og:description" content=".*?"\s*\/>/, `<meta property="og:description" content="${description}" />`)
  html = html.replace(/<meta property="og:image" content=".*?"\s*\/>/, `<meta property="og:image" content="${image}" />`)
  html = html.replace(/<meta name="twitter:title" content=".*?"\s*\/>/, `<meta name="twitter:title" content="${title}" />`)
  html = html.replace(/<meta name="twitter:description" content=".*?"\s*\/>/, `<meta name="twitter:description" content="${description}" />`)
  html = html.replace(/<meta name="twitter:image" content=".*?"\s*\/>/, `<meta name="twitter:image" content="${image}" />`)
  html = html.replace('</head>', `  <meta property="og:url" content="${url}" />\n</head>`)
  html = html.replace(/<meta property="og:type" content=".*?"\s*\/>/, `<meta property="og:type" content="article" />`)
  html += `` // no-op, keeps structure readable
  html = html.replace('</head>', `  <link rel="canonical" href="${url}" />\n</head>`)

  const outDir = path.join(DIST, 'blog', post.slug)
  await mkdir(outDir, { recursive: true })
  await writeFile(path.join(outDir, 'index.html'), html)
}

const el = (type, style, children) => ({ type, props: { style, children } })

function ogCard(post, avatar, domain) {
  const tags = postTags(post).slice(0, 2)
  const title = post.title || ''
  const size = title.length <= 38 ? 76 : title.length <= 62 ? 64 : 54
  const date = post.publishedAt
    ? new Date(post.publishedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    : ''
  return el(
    'div',
    {
      display: 'flex', flexDirection: 'column', justifyContent: 'space-between', width: 1200, height: 630,
      boxSizing: 'border-box', padding: '64px 72px', color: '#ffffff', fontFamily: 'Inter',
      backgroundImage: 'linear-gradient(135deg, #0f1a4d, #223a8f 55%, #3b5fe0)',
    },
    [
      el('div', { display: 'flex', alignItems: 'center', gap: 14 }, [
        ...tags.map((t) => el('div', { display: 'flex', padding: '6px 18px', border: '2px solid rgba(255,255,255,0.55)', borderRadius: 99, fontSize: 24 }, t)),
        el('div', { display: 'flex', fontSize: 24, opacity: 0.75, marginLeft: 6 }, date),
      ]),
      el('div', { display: 'flex', fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: size, lineHeight: 1.08, letterSpacing: -2, maxWidth: 1020 }, title),
      el('div', { display: 'flex', alignItems: 'center', gap: 18 }, [
        { type: 'img', props: { src: avatar, width: 72, height: 72, style: { width: 72, height: 72, borderRadius: 36 } } },
        el('div', { display: 'flex', flexDirection: 'column' }, [
          el('div', { display: 'flex', fontSize: 28, fontWeight: 500 }, 'Oseghale Wilfred'),
          el('div', { display: 'flex', fontSize: 22, opacity: 0.75 }, domain),
        ]),
      ]),
    ]
  )
}

// One 1200x630 title card per blog post, written to dist/og/<slug>.png, so every
// post shares with its own title on WhatsApp, LinkedIn and X. If the image tools
// are missing or something fails, the build carries on and posts fall back to
// their cover image or the site-wide card.
async function makeOgImages(posts, siteUrl) {
  const made = new Set()
  let satori
  let Resvg
  try {
    satori = (await import('satori')).default
    ;({ Resvg } = await import('@resvg/resvg-js'))
  } catch (err) {
    console.warn('[postbuild] share images skipped:', err.message)
    return made
  }
  try {
    const font = (pkg, file) => readFile(path.resolve('node_modules', '@fontsource', pkg, 'files', file))
    const fonts = [
      { name: 'Space Grotesk', data: await font('space-grotesk', 'space-grotesk-latin-700-normal.woff'), weight: 700, style: 'normal' },
      { name: 'Inter', data: await font('inter', 'inter-latin-500-normal.woff'), weight: 500, style: 'normal' },
    ]
    const avatar = `data:image/jpeg;base64,${(await readFile(path.resolve('public/images/avatar.jpg'))).toString('base64')}`
    const domain = new URL(siteUrl).host
    await mkdir(path.join(DIST, 'og'), { recursive: true })
    for (const post of posts) {
      try {
        const svg = await satori(ogCard(post, avatar, domain), { width: 1200, height: 630, fonts })
        const png = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } }).render().asPng()
        await writeFile(path.join(DIST, 'og', `${post.slug}.png`), png)
        made.add(post.slug)
      } catch (err) {
        console.warn(`[postbuild] share image failed for ${post.slug}:`, err.message)
      }
    }
  } catch (err) {
    console.warn('[postbuild] share images skipped:', err.message)
  }
  return made
}

// The home page is served from the same index.html, so crawlers that do not run
// JavaScript (WhatsApp, LinkedIn, X) need absolute image and canonical URLs in it.
async function writeHomeHtml(template, siteUrl) {
  const base = siteUrl.replace(/\/$/, '')
  const image = `${base}/images/og-card.jpg`
  let html = template
  html = html.replace(/<meta property="og:image" content=".*?"\s*\/>/, `<meta property="og:image" content="${image}" />`)
  html = html.replace(/<meta name="twitter:image" content=".*?"\s*\/>/, `<meta name="twitter:image" content="${image}" />`)
  html = html.replace('</head>', `  <link rel="canonical" href="${base}/" />\n  <meta property="og:url" content="${base}/" />\n</head>`)
  await writeFile(path.join(DIST, 'index.html'), html)
}

async function run() {
  const { posts, projects, settings } = await getBuildTimeContent()
  const template = await readFile(path.join(DIST, 'index.html'), 'utf-8')

  await writeSitemapAndRobots(posts, projects, settings.siteUrl)

  const ogMade = await makeOgImages(posts, settings.siteUrl)
  for (const post of posts) {
    await writePostHtml(template, post, settings.siteUrl, ogMade)
  }
  await writeHomeHtml(template, settings.siteUrl)
  console.log(`[postbuild] pre-rendered SEO tags for ${posts.length} blog post(s) and the home page, ${ogMade.size} share image(s)`)
}

run().catch((err) => {
  console.error('[postbuild] failed:', err)
  process.exitCode = 1
})
