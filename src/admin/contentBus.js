// Every time an editor loads or saves a content file it announces the new data
// here. The Overview listens, so its checklist and counts follow your edits
// straight away instead of waiting for a refetch from GitHub.
const listeners = new Set()

export function publishContent(type, data) {
  listeners.forEach((fn) => fn(type, data))
}

export function onContent(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
