// Service worker for the installed admin app (scope: /admin only, the public
// site is untouched). It deliberately caches nothing: the admin must always
// show your latest content and code. Its one job is to show a clear offline
// screen instead of the browser's error page when the app opens without a
// connection.
const OFFLINE_HTML = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#0b1020"><title>Admin, offline</title>
<style>
  :root { color-scheme: dark; }
  body { margin: 0; min-height: 100dvh; display: grid; place-items: center; padding: 24px;
    background: #0b1020; color: #e8ecf8; font: 16px/1.5 Inter, system-ui, sans-serif; text-align: center; }
  h1 { font-size: 1.3rem; margin: 0 0 6px; }
  p { margin: 0 0 20px; color: #97a2bd; max-width: 30ch; }
  button { min-height: 44px; padding: 0 20px; border: 0; border-radius: 10px; background: #6f8cff; color: #fff; font: 600 1rem Inter, system-ui, sans-serif; }
</style></head><body><main>
<h1>You are offline</h1>
<p>The admin saves straight to GitHub, so it needs a connection. Your unsaved post writing is kept on this device.</p>
<button onclick="location.reload()">Try again</button>
</main></body></html>`

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))

// Sharing to the app from Android's share sheet posts here (see share_target
// in admin.webmanifest). Nothing is uploaded yet: the items are kept in a small
// cache and the admin opens, signs you in if needed, and turns them into a
// draft (src/admin/share.js).
async function receiveShare(request) {
  try {
    const form = await request.formData()
    const files = form.getAll('images').filter((f) => f && typeof f === 'object' && f.size)
    const cache = await caches.open('admin-share')
    await Promise.all(
      files.slice(0, 6).map((f, i) =>
        cache.put(
          `/admin-share/file-${i}`,
          new Response(f, { headers: { 'Content-Type': f.type || 'image/jpeg', 'X-Filename': encodeURIComponent(f.name || `shared-${i + 1}`) } })
        )
      )
    )
    const meta = {
      title: String(form.get('title') || ''),
      text: String(form.get('text') || ''),
      url: String(form.get('url') || ''),
      files: Math.min(files.length, 6),
    }
    await cache.put('/admin-share/meta', new Response(JSON.stringify(meta), { headers: { 'Content-Type': 'application/json' } }))
  } catch {
    /* the admin says nothing came through */
  }
  return Response.redirect('/admin?shared=1#posts', 303)
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  if (event.request.method === 'POST' && url.pathname === '/admin/share') {
    event.respondWith(receiveShare(event.request))
    return
  }
  if (event.request.mode !== 'navigate') return
  event.respondWith(
    fetch(event.request).catch(
      () => new Response(OFFLINE_HTML, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
    )
  )
})
