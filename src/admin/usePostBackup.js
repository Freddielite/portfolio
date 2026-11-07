import { useEffect, useRef, useState } from 'react'

// Keeps a copy of unsaved blog post edits on this device, so a reload, a
// crashed tab or a phone that drops the page does not lose your writing.
//
// Only the posts that differ from what is saved on GitHub are stored (plus
// which ones were deleted), never the whole list, so restoring an old backup
// cannot undo changes made since on another device. The copy is cleared after
// a save or a discard.
const KEY = 'admin:unsaved-posts'
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)

function read() {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function write(value) {
  try {
    if (value) localStorage.setItem(KEY, JSON.stringify(value))
    else localStorage.removeItem(KEY)
  } catch {
    /* storage full or blocked: the backup is a convenience, carry on without it */
  }
}

function diff(list, base) {
  const byId = new Map(base.map((p) => [p._id, p]))
  const changed = list.filter((p) => !byId.has(p._id) || !same(p, byId.get(p._id)))
  const ids = new Set(list.map((p) => p._id))
  const deleted = base.filter((p) => !ids.has(p._id)).map((p) => p._id)
  return { changed, deleted }
}

// True when writing from an earlier visit is waiting on this device.
export function hasUnsavedPostWriting() {
  const b = read()
  return !!b && ((b.changed && b.changed.length > 0) || (b.deleted && b.deleted.length > 0))
}

export function applyBackup(list, backup) {
  const gone = new Set(backup.deleted)
  const incoming = new Map(backup.changed.map((p) => [p._id, p]))
  const next = list.filter((p) => !gone.has(p._id)).map((p) => incoming.get(p._id) || p)
  const have = new Set(next.map((p) => p._id))
  const added = backup.changed.filter((p) => !have.has(p._id))
  return [...added, ...next]
}

// list: what is in the editor. base: what is saved (null while loading).
export default function usePostBackup(list, base) {
  const [offer, setOffer] = useState(null)
  const checked = useRef(false)
  const lastSavedBase = useRef(null)

  // Once, after the first load: is there writing from an earlier visit that
  // is not on GitHub yet?
  useEffect(() => {
    if (checked.current || !base) return
    checked.current = true
    lastSavedBase.current = base
    const stored = read()
    if (!stored) return
    const { changed, deleted } = diff(applyBackup(base, stored), base)
    if (changed.length || deleted.length) setOffer({ ...stored, changed, deleted })
    else write(null)
  }, [base])

  // While editing, keep the copy up to date (debounced so typing stays smooth).
  useEffect(() => {
    if (!list || !base || !checked.current || offer) return
    const t = setTimeout(() => {
      const { changed, deleted } = diff(list, base)
      write(changed.length || deleted.length ? { at: Date.now(), changed, deleted } : null)
    }, 500)
    return () => clearTimeout(t)
  }, [list, base, offer])

  return {
    offer,
    dismiss: () => {
      setOffer(null)
      write(null)
    },
    accept: () => setOffer(null),
    clear: () => write(null),
  }
}
