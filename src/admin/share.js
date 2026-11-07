// Android's share sheet sends shared items to /admin/share. The service worker
// (public/admin-sw.js) catches that request, keeps the items in a small cache
// and opens the admin with ?shared=1. This reads them back, once.
const CACHE = 'admin-share'

export async function takeShared() {
  if (!('caches' in window)) return null
  try {
    const cache = await caches.open(CACHE)
    const metaRes = await cache.match('/admin-share/meta')
    if (!metaRes) return null
    const meta = await metaRes.json()
    const files = []
    for (let i = 0; i < (meta.files || 0); i++) {
      const res = await cache.match(`/admin-share/file-${i}`)
      if (!res) continue
      const blob = await res.blob()
      const name = decodeURIComponent(res.headers.get('X-Filename') || `shared-${i + 1}`)
      files.push(new File([blob], name, { type: blob.type || res.headers.get('Content-Type') || 'image/jpeg' }))
    }
    await caches.delete(CACHE)
    return { title: meta.title || '', text: meta.text || '', url: meta.url || '', files }
  } catch {
    return null
  }
}
