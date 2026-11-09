import { ChevronLeft, ChevronRight } from 'lucide-react'

// Pagination for the admin's long lists. Keep `page` in state in the list's own
// component, call paginate() on the (already filtered and sorted) items, show the
// page's items, and put <Pager> underneath. It renders nothing for a single page.
export function paginate(items, page, size) {
  const pages = Math.max(1, Math.ceil(items.length / size))
  const current = Math.min(Math.max(1, page), pages) // stays valid when the list shrinks
  const start = (current - 1) * size
  return {
    page: current,
    pages,
    total: items.length,
    from: items.length ? start + 1 : 0,
    to: Math.min(start + size, items.length),
    items: items.slice(start, start + size),
  }
}

// 1 ... 4 5 6 ... 12 style list of page numbers, never more than 7 entries.
function windowed(page, pages) {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1)
  const out = [1]
  const lo = Math.max(2, page - 1)
  const hi = Math.min(pages - 1, page + 1)
  if (lo > 2) out.push('gap-left')
  for (let n = lo; n <= hi; n++) out.push(n)
  if (hi < pages - 1) out.push('gap-right')
  out.push(pages)
  return out
}

// `compact` swaps the page numbers for "Page 2 of 4", for narrow places.
export default function Pager({ p, onPage, compact = false, label = 'items' }) {
  if (!p || p.pages <= 1) return null
  const go = (n) => onPage(Math.min(Math.max(1, n), p.pages))
  return (
    <nav className={`admin-pager ${compact ? 'is-compact' : ''}`} aria-label={`Pages of ${label}`}>
      <span className="admin-pager-count">{p.from}–{p.to} of {p.total}</span>
      <div className="admin-pager-controls">
        <button type="button" className="admin-pager-btn" onClick={() => go(p.page - 1)} disabled={p.page === 1} aria-label="Previous page">
          <ChevronLeft size={16} aria-hidden="true" />
        </button>
        {compact ? (
          <span className="admin-pager-of">Page {p.page} of {p.pages}</span>
        ) : (
          windowed(p.page, p.pages).map((n) =>
            typeof n === 'string' ? (
              <span key={n} className="admin-pager-gap" aria-hidden="true">…</span>
            ) : (
              <button key={n} type="button" className={`admin-pager-btn ${n === p.page ? 'on' : ''}`} onClick={() => go(n)} aria-label={`Page ${n}`} aria-current={n === p.page ? 'page' : undefined}>
                {n}
              </button>
            )
          )
        )}
        <button type="button" className="admin-pager-btn" onClick={() => go(p.page + 1)} disabled={p.page === p.pages} aria-label="Next page">
          <ChevronRight size={16} aria-hidden="true" />
        </button>
      </div>
    </nav>
  )
}
