// Things the phone asked the admin to do (a shortcut, something shared) that a tab
// has to pick up. The tab may not have been opened yet, so they wait here until it
// asks. Taking one removes it, so it is only ever done once.
const waiting = []

export function pushIntent(intent) {
  waiting.push(intent)
  window.dispatchEvent(new Event('admin:intent'))
}

export function takeIntent(kind) {
  const at = waiting.findIndex((i) => i.kind === kind)
  return at < 0 ? null : waiting.splice(at, 1)[0]
}

// Turns what the Android share sheet sent into the shape the draft code expects.
// Photos arrive as base64; fetch() on a data URL is the cheap way back to a Blob.
export async function sharedFromPhone(i) {
  const files = []
  for (const [n, img] of (i.images || []).entries()) {
    try {
      const blob = await (await fetch(`data:${img.type};base64,${img.data}`)).blob()
      files.push(new File([blob], img.name || `shared-${n + 1}.jpg`, { type: img.type }))
    } catch {
      /* skip a photo that did not come through */
    }
  }
  const raw = String(i.text || '').trim()
  const bareLink = /^https?:\/\/\S+$/.test(raw) // Chrome shares just the address
  return { title: String(i.title || '').trim(), text: bareLink ? '' : raw, url: bareLink ? raw : '', files }
}
