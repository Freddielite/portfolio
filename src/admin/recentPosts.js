// The two posts you opened last, remembered on this phone and handed to Android so
// long-pressing the app icon offers "Edit: <title>" for each.
import { setRecentPosts } from './native.js'

const KEY = 'admin:recent-posts'

function read() {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) || '[]')
    return Array.isArray(list) ? list.filter((r) => r && r.slug).slice(0, 2) : []
  } catch {
    return []
  }
}

function write(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list))
  } catch {
    /* storage full or blocked: the shortcuts just do not update */
  }
}

export function noteRecentPost({ slug, title }) {
  if (!slug) return read()
  const next = [{ slug, title: String(title || slug).slice(0, 80) }, ...read().filter((r) => r.slug !== slug)].slice(0, 2)
  write(next)
  setRecentPosts(next)
  return next
}

export function forgetRecentPost(slug) {
  const next = read().filter((r) => r.slug !== slug)
  write(next)
  setRecentPosts(next)
}

// Called when the admin opens, so the shortcuts are right even if the app was updated.
export const syncRecentPosts = () => setRecentPosts(read())
