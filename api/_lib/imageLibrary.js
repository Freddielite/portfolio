// The Image library: which uploaded images exist, which are used by your content, and
// a safe way to delete the ones that are not. Pure logic, with GitHub passed in, so it
// is easy to test.
//
// Safety rules (the server enforces them, whatever the screen sends):
//  - Only images the admin itself uploaded can be deleted: public/images/<folder>/<13-digit
//    time>-<name>. Seed images such as avatar.jpg may be used straight from the site's
//    code, which cannot be checked from here, so they are never offered for deletion.
//  - An image is "used" if its path appears anywhere in the content files (projects,
//    posts, drafts, site settings, testimonials, skills). That covers cover images, photos,
//    galleries and pictures inside a post, because it looks at the raw text.
//  - An image uploaded in the last 24 hours is protected: it may belong to something you
//    are editing and have not saved yet.
//  - Usage is checked again at the moment of deleting, and if the content cannot be read
//    nothing is deleted.

export const CONTENT_FILES = [
  ['content/projects.json', 'Projects'],
  ['content/posts.json', 'Blog posts'],
  ['content/drafts.json', 'Draft posts'],
  ['content/siteSettings.json', 'Site settings'],
  ['content/testimonials.json', 'Testimonials'],
  ['content/skills.json', 'Skills'],
]

export const PROTECT_MS = 24 * 60 * 60 * 1000
export const MAX_DELETE = 50

const IMAGE_EXT = /\.(png|jpe?g|gif|webp|avif)$/i
const OWNED = /^public\/images\/(uploads|blog|profile|projects)\/(\d{13})-([A-Za-z0-9._-]+)$/
const URL_PATH = /^\/images\/(uploads|blog|profile|projects)\/\d{13}-[A-Za-z0-9._-]+$/

export const isDeletablePath = (p) => URL_PATH.test(String(p || ''))

const titleOf = (item) => String(item?.title || item?.name || item?.company || item?.author || item?.slug || item?.id || '').slice(0, 60)

// Which parts of the content use this path, e.g. ["Projects: Wynmail", "Site settings"].
function usedBy(urlPath, contents) {
  const out = []
  for (const c of contents) {
    if (!c.text || !c.text.includes(urlPath)) continue
    let labels = null
    try {
      const data = JSON.parse(c.text)
      if (Array.isArray(data)) {
        labels = data.filter((item) => JSON.stringify(item).includes(urlPath)).map((item) => (titleOf(item) ? `${c.label}: ${titleOf(item)}` : c.label))
      }
    } catch {
      /* fall through to the plain label */
    }
    out.push(...(labels && labels.length ? labels : [c.label]))
  }
  return [...new Set(out)].slice(0, 4)
}

// files: [{ path, size }] from the repo (paths start with public/images/);
// contents: [{ label, text }]. Returns the library, newest uploads first.
export function buildLibrary(files, contents, now = Date.now()) {
  const images = []
  for (const f of files) {
    if (!f.path.startsWith('public/images/') || !IMAGE_EXT.test(f.path)) continue
    const urlPath = `/${f.path.replace(/^public\//, '')}`
    const m = OWNED.exec(f.path)
    const uploadedMs = m ? Number(m[2]) : null
    const by = usedBy(urlPath, contents)
    let state
    if (by.length) state = 'used'
    else if (!m) state = 'site'
    else if (now - uploadedMs < PROTECT_MS) state = 'recent'
    else state = 'unused'
    images.push({
      path: urlPath,
      name: m ? m[3] : f.path.split('/').pop(),
      folder: f.path.split('/')[2] || '',
      size: f.size || 0,
      uploadedAt: uploadedMs ? new Date(uploadedMs).toISOString() : null,
      state, // used | unused | recent | site
      usedBy: by,
      deletable: state === 'unused',
    })
  }
  images.sort((a, b) => (b.uploadedAt ? Date.parse(b.uploadedAt) : 0) - (a.uploadedAt ? Date.parse(a.uploadedAt) : 0) || a.path.localeCompare(b.path))
  const count = (st) => images.filter((i) => i.state === st)
  const bytes = (list) => list.reduce((n, i) => n + i.size, 0)
  return {
    images,
    summary: {
      total: images.length,
      totalBytes: bytes(images),
      used: count('used').length,
      unused: count('unused').length,
      unusedBytes: bytes(count('unused')),
      recent: count('recent').length,
      site: count('site').length,
    },
  }
}

// deps: { listFiles(): [{path,size,sha}], readContents(files): [{label,text}], remove(paths, message) }
export async function loadLibrary(deps, { light = false, now = Date.now() } = {}) {
  const files = await deps.listFiles()
  const contents = light ? [] : await deps.readContents(files)
  const lib = buildLibrary(files, contents, now)
  return { ...lib, light, at: new Date(now).toISOString() }
}

const WHY = {
  used: 'It is used by your content.',
  recent: 'It was uploaded in the last 24 hours, so it may belong to something you have not saved yet.',
  site: 'It is part of the site itself.',
}

export async function deleteImages(requested, deps, { now = Date.now() } = {}) {
  const list = [...new Set(Array.isArray(requested) ? requested.map(String) : [])]
  if (!list.length) return { deleted: [], refused: [] }
  if (list.length > MAX_DELETE) {
    const err = new Error(`Delete at most ${MAX_DELETE} images at a time.`)
    err.status = 400
    throw err
  }
  const files = await deps.listFiles()
  const contents = await deps.readContents(files) // throws if any content file cannot be read: then nothing is deleted
  const byPath = new Map(buildLibrary(files, contents, now).images.map((i) => [i.path, i]))
  const refused = []
  const ok = []
  for (const p of list) {
    const img = byPath.get(p)
    if (!isDeletablePath(p)) refused.push({ path: p, reason: 'That is not an image this admin uploaded.' })
    else if (!img) refused.push({ path: p, reason: 'It is already gone.' })
    else if (!img.deletable) refused.push({ path: p, reason: WHY[img.state] || 'It cannot be deleted.' })
    else ok.push(img)
  }
  if (ok.length) await deps.remove(ok.map((i) => `public${i.path}`), `admin: delete ${ok.length} unused image${ok.length === 1 ? '' : 's'}`)
  return { deleted: ok.map((i) => i.path), refused }
}
