// The block editor edits a list of "items" (one per paragraph, image, code block or
// columns group) and converts to and from the stored post body. Items inside columns
// live in item.cols = [leftItems, rightItems]. No React in here, so it is easy to test.
import { blocksToText, textToBlocks } from '../portableText.js'

export const RATIOS = [
  ['half', 'Equal halves'],
  ['narrow-left', 'Narrow left, wide right'],
  ['narrow-right', 'Wide left, narrow right'],
]

let n = 0
export const uid = () => `i${(n++).toString(36)}${Math.random().toString(36).slice(2, 7)}`

export function newItem(kind, extra = {}) {
  if (kind === 'text') return { id: uid(), kind, text: '', ...extra }
  if (kind === 'image') return { id: uid(), kind, url: '', alt: '', ...extra }
  if (kind === 'code') return { id: uid(), kind, language: '', code: '', ...extra }
  if (kind === 'columns') return { id: uid(), kind, ratio: 'half', cols: [[newItem('text')], [newItem('text')]], ...extra }
  throw new Error(`Unknown block kind ${kind}`)
}

// ---------- stored body <-> editor items ----------

export function blocksToItems(blocks) {
  const items = []
  const list = Array.isArray(blocks) ? blocks : []
  for (let i = 0; i < list.length; i++) {
    const b = list[i]
    if (!b) continue
    if (b._type === 'image') items.push(newItem('image', { url: b.url || '', alt: b.alt || '' }))
    else if (b._type === 'code') items.push(newItem('code', { language: b.language || '', code: b.code || '' }))
    else if (b._type === 'columns') {
      items.push(newItem('columns', { ratio: b.ratio || 'half', cols: [blocksToItems(b.left), blocksToItems(b.right)] }))
    } else if (b.listItem) {
      // keep a whole list together as one item
      const group = [b]
      while (list[i + 1] && list[i + 1]._type === 'block' && list[i + 1].listItem === b.listItem) group.push(list[++i])
      items.push(newItem('text', { text: blocksToText(group) }))
    } else if (b._type === 'block') items.push(newItem('text', { text: blocksToText([b]) }))
  }
  return items
}

export function itemsToBlocks(items) {
  const out = []
  for (const it of items || []) {
    if (it.kind === 'text') out.push(...textToBlocks(it.text))
    else if (it.kind === 'image') {
      if (it.url) out.push({ _type: 'image', _key: it.id, alt: it.alt || '', url: it.url })
    } else if (it.kind === 'code') out.push({ _type: 'code', _key: it.id, language: it.language || '', code: it.code || '' })
    else if (it.kind === 'columns') {
      out.push({ _type: 'columns', _key: it.id, ratio: it.ratio || 'half', left: itemsToBlocks(it.cols[0]), right: itemsToBlocks(it.cols[1]) })
    }
  }
  return out
}

// A text item that now holds several paragraphs becomes several items.
export function splitTextItem(item) {
  return blocksToItems(textToBlocks(item.text))
}

// ---------- containers: 'root', or `${columnsItemId}:0` / `${columnsItemId}:1` ----------

export const isColumnId = (cid) => typeof cid === 'string' && /^.+:[01]$/.test(cid)
export const isContainerId = (id) => id === 'root' || isColumnId(id)

export function getList(items, cid) {
  if (cid === 'root') return items
  const [id, side] = cid.split(':')
  const c = items.find((i) => i.id === id && i.kind === 'columns')
  return c ? c.cols[Number(side)] : null
}

export function setList(items, cid, list) {
  if (cid === 'root') return list
  const [id, side] = cid.split(':')
  return items.map((i) => (i.id === id ? { ...i, cols: i.cols.map((c, k) => (k === Number(side) ? list : c)) } : i))
}

export function findContainer(items, id) {
  if (items.some((i) => i.id === id)) return 'root'
  for (const i of items) {
    if (i.kind !== 'columns') continue
    for (const k of [0, 1]) if (i.cols[k].some((x) => x.id === id)) return `${i.id}:${k}`
  }
  return null
}

export function findItem(items, id) {
  for (const i of items) {
    if (i.id === id) return i
    if (i.kind === 'columns') {
      const f = findItem(i.cols[0], id) || findItem(i.cols[1], id)
      if (f) return f
    }
  }
  return null
}

export function updateItem(items, id, patch) {
  return items.map((i) => {
    if (i.id === id) return { ...i, ...patch }
    if (i.kind === 'columns') return { ...i, cols: i.cols.map((c) => updateItem(c, id, patch)) }
    return i
  })
}

export function removeItem(items, id) {
  const cid = findContainer(items, id)
  if (!cid) return items
  return setList(items, cid, getList(items, cid).filter((i) => i.id !== id))
}

export function replaceItem(items, id, replacements) {
  const cid = findContainer(items, id)
  if (!cid) return items
  const list = getList(items, cid)
  const at = list.findIndex((i) => i.id === id)
  return setList(items, cid, [...list.slice(0, at), ...replacements, ...list.slice(at + 1)])
}

export function insertInto(items, cid, index, item) {
  const list = getList(items, cid)
  if (!list) return items
  const at = Math.max(0, Math.min(index ?? list.length, list.length))
  return setList(items, cid, [...list.slice(0, at), item, ...list.slice(at)])
}

export function insertAfter(items, afterId, item) {
  const cid = afterId ? findContainer(items, afterId) : null
  if (!cid) return insertInto(items, 'root', undefined, item)
  const at = getList(items, cid).findIndex((i) => i.id === afterId)
  return insertInto(items, cid, at + 1, item)
}

// Move an item to a position in any container. Columns cannot go inside columns.
export function moveItem(items, id, toCid, toIndex) {
  const item = findItem(items, id)
  if (!item) return items
  if (item.kind === 'columns' && toCid !== 'root') return items
  const without = removeItem(items, id)
  if (!getList(without, toCid)) return items
  return insertInto(without, toCid, toIndex, item)
}

// Move one step up (-1) or down (+1) inside its own container.
export function nudgeItem(items, id, dir) {
  const cid = findContainer(items, id)
  if (!cid) return items
  const list = getList(items, cid)
  const at = list.findIndex((i) => i.id === id)
  const to = at + dir
  if (to < 0 || to >= list.length) return items
  const next = [...list]
  ;[next[at], next[to]] = [next[to], next[at]]
  return setList(items, cid, next)
}

// A short name for the block header.
export function textLabel(text) {
  const t = String(text || '').trimStart()
  if (/^##\s/.test(t) && !/^###/.test(t)) return 'Heading'
  if (/^###\s/.test(t)) return 'Subheading'
  if (/^[-*]\s/.test(t)) return 'Bullet list'
  if (/^\d+\.\s/.test(t)) return 'Numbered list'
  if (/^>/.test(t)) return 'Quote'
  return 'Text'
}
