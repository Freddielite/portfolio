// The blog renderer (BlogPost.jsx) uses @portabletext/react, which expects
// the body as an array of "block" objects. Authoring raw block JSON by hand
// would be a terrible admin UX, so the admin just uses a plain textarea —
// paragraphs separated by a blank line — and converts to/from blocks here.

export function blocksToText(blocks) {
  if (!Array.isArray(blocks)) return ''
  return blocks
    .map((block) => (block.children || []).map((child) => child.text || '').join(''))
    .join('\n\n')
}

export function textToBlocks(text) {
  return String(text || '')
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => ({
      _type: 'block',
      style: 'normal',
      children: [{ _type: 'span', text: paragraph }],
    }))
}
