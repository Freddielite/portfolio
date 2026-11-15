import { isNative, shareOut } from './native.js'

// The address of a published post, as visitors open it.
export const postUrl = (post, origin = window.location.origin) => `${origin}/blog/${post.slug}`

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // Some browsers only allow copying through a hidden field.
    const field = Object.assign(document.createElement('textarea'), { value: text })
    field.style.cssText = 'position:fixed;top:-100px;opacity:0'
    document.body.appendChild(field)
    field.select()
    let ok = false
    try {
      ok = document.execCommand('copy')
    } catch {
      ok = false
    }
    field.remove()
    return ok
  }
}

// 'shared' (the share sheet was used), 'copied' (no share sheet here, so the link was
// copied instead), 'cancelled' or 'failed'.
export async function shareLink({ title, url }) {
  try {
    if (isNative()) {
      await shareOut({ title, url, dialogTitle: 'Share this post' })
      return 'shared'
    }
    if (navigator.share) {
      await navigator.share({ title, url })
      return 'shared'
    }
  } catch (err) {
    if (err?.name === 'AbortError' || /cancel/i.test(String(err?.message))) return 'cancelled'
  }
  return (await copyText(url)) ? 'copied' : 'failed'
}
