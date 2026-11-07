// The email Wynmail sends for a blog post: title, summary, cover and a button.
// Wynmail adds the unsubscribe link and postal address footer itself.

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

const absolute = (base, url) => {
  if (!url) return ''
  if (/^https?:\/\//i.test(url)) return url
  return `${base}${url.startsWith('/') ? '' : '/'}${url}`
}

export function postEmail({ post, siteUrl, authorName }) {
  const base = String(siteUrl || '').replace(/\/+$/, '')
  const link = `${base}/blog/${post.slug}`
  const cover = absolute(base, post.coverImage)
  const html = `<div style="background:#f4f6fb;padding:24px 12px;font-family:Helvetica,Arial,sans-serif;color:#0f172a">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e2e8f0">
    ${cover ? `<a href="${esc(link)}"><img src="${esc(cover)}" alt="${esc(post.coverAlt || '')}" width="560" style="display:block;width:100%;height:auto;border:0"></a>` : ''}
    <div style="padding:28px 28px 8px">
      <p style="margin:0 0 10px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#64748b">New on the blog</p>
      <h1 style="margin:0 0 14px;font-size:24px;line-height:1.25;color:#0f172a">${esc(post.title)}</h1>
      <p style="margin:0 0 22px;font-size:16px;line-height:1.6;color:#334155">${esc(post.excerpt)}</p>
      <a href="${esc(link)}" style="display:inline-block;background:#1d4ed8;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 22px;border-radius:999px">Read the post</a>
    </div>
    <p style="margin:0;padding:22px 28px 28px;font-size:14px;line-height:1.5;color:#64748b">${esc(authorName || '')}</p>
  </div>
</div>`
  return { subject: post.title, preview: String(post.excerpt || '').slice(0, 150), html, link }
}
