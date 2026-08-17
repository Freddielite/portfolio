// Deterministic subsequence-based fuzzy match, no dependency. Good enough
// for scoring a few dozen command-palette items against a short query —
// doesn't need a real fuzzy-search library.
//
// Returns a score (higher = better match) or null if `query`'s characters
// don't all appear in `text`, in order. Rewards: matches at the start of
// the string, matches at the start of a word, and consecutive-character
// runs (so "cs" ranks "Case Studies" above "cars sold").
export function fuzzyScore(text, query) {
  if (!query) return 0
  const t = text.toLowerCase()
  const q = query.toLowerCase()

  let score = 0
  let tIndex = 0
  let consecutive = 0

  for (let qIndex = 0; qIndex < q.length; qIndex++) {
    const ch = q[qIndex]
    const found = t.indexOf(ch, tIndex)
    if (found === -1) return null

    if (found === 0) score += 8
    else if (t[found - 1] === ' ') score += 5
    if (found === tIndex) {
      consecutive += 1
      score += consecutive * 2
    } else {
      consecutive = 0
    }

    score += Math.max(0, 3 - (found - tIndex)) // small penalty for gaps
    tIndex = found + 1
  }

  // Prefer shorter overall strings when scores are otherwise close (a
  // tighter match for the same query).
  score += Math.max(0, 10 - text.length / 4)
  return score
}

export function fuzzySearch(items, query, getText) {
  if (!query) return items
  const scored = items
    .map((item) => ({ item, score: fuzzyScore(getText(item), query) }))
    .filter((s) => s.score !== null)
  scored.sort((a, b) => b.score - a.score)
  return scored.map((s) => s.item)
}
