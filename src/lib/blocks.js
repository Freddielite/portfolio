// Post bodies are lists of blocks. A "columns" block holds two more lists (left and
// right), so anything that reads the body (reading time, contents list, SEO checks)
// goes through this to also see the blocks inside columns, in reading order.
export function flattenBlocks(body) {
  const out = []
  const walk = (list) =>
    (list || []).forEach((b) => {
      if (!b) return
      if (b._type === 'columns') {
        walk(b.left)
        walk(b.right)
      } else out.push(b)
    })
  walk(body)
  return out
}
