// Copy text to the clipboard. Falls back to a hidden textarea where the clipboard
// API is blocked (some webviews, plain http). Returns true when it worked.
export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.setAttribute('readonly', '')
    ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0'
    document.body.appendChild(ta)
    ta.select()
    let ok = false
    try {
      ok = document.execCommand('copy')
    } catch {
      /* fall through */
    }
    ta.remove()
    return ok
  }
}
