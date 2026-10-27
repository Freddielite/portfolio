// The blog renderer (BlogPost.jsx) uses @portabletext/react, which expects
// the body as an array of "block" objects. Authoring raw block JSON by hand
// would be a terrible admin UX, so the admin uses a plain textarea and
// converts to and from blocks here.
//
// Format: paragraphs are separated by a blank line.
//   "## Heading"   becomes a heading
//   "### Heading"  becomes a smaller heading
//   lines starting with "- " become a bullet list

const text = (block) => (block.children || []).map((child) => child.text || '').join('')

export function blocksToText(blocks) {
  if (!Array.isArray(blocks)) return ''
  const out = []
  blocks.forEach((block, i) => {
    let line = text(block)
    if (block.listItem) line = `- ${line}`
    else if (block.style === 'h2') line = `## ${line}`
    else if (block.style === 'h3') line = `### ${line}`
    const prev = blocks[i - 1]
    const joinTight = block.listItem && prev && prev.listItem
    out.push((i === 0 ? '' : joinTight ? '\n' : '\n\n') + line)
  })
  return out.join('')
}

const span = (t) => [{ _type: 'span', text: t }]

export function textToBlocks(input) {
  const blocks = []
  String(input || '')
    .split(/\n\s*\n/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .forEach((chunk) => {
      const lines = chunk.split('\n').map((l) => l.trim())
      if (lines.every((l) => l.startsWith('- '))) {
        lines.forEach((l) =>
          blocks.push({ _type: 'block', style: 'normal', listItem: 'bullet', level: 1, children: span(l.slice(2)) })
        )
      } else if (chunk.startsWith('### ')) {
        blocks.push({ _type: 'block', style: 'h3', children: span(chunk.slice(4)) })
      } else if (chunk.startsWith('## ')) {
        blocks.push({ _type: 'block', style: 'h2', children: span(chunk.slice(3)) })
      } else {
        blocks.push({ _type: 'block', style: 'normal', children: span(chunk) })
      }
    })
  return blocks
}
