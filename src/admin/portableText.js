// The blog renderer (BlogPost.jsx) uses @portabletext/react, which wants the post
// body as an array of "block" objects. Writing that by hand would be miserable,
// so the admin edits plain text with light formatting and converts here.
//
// Block syntax (blocks are separated by a blank line):
//   ## Heading          ### Smaller heading
//   - bullet            1. numbered item
//   > quote
//   ```js               fenced code block, closed with ```
//   ![alt text](/images/blog/photo.webp)    an image on its own line
// Inline syntax:  **bold**   *italic*   `code`   [text](https://link)

import { flattenBlocks } from '../lib/blocks.js'

let keyCounter = 0
const key = () => `k${(keyCounter++).toString(36)}${Math.random().toString(36).slice(2, 6)}`

const INLINE = /(\*\*[^*\n]+?\*\*)|(`[^`\n]+?`)|(\[[^\]\n]+?\]\([^)\s]+?\))|((?<![*\w])\*[^*\s][^*\n]*?\*(?![*\w]))/g

export function parseInline(text) {
  const children = []
  const markDefs = []
  let last = 0
  let m
  INLINE.lastIndex = 0
  const plain = (t) => t && children.push({ _type: 'span', _key: key(), text: t, marks: [] })
  while ((m = INLINE.exec(text)) !== null) {
    plain(text.slice(last, m.index))
    const [token] = m
    if (m[1]) children.push({ _type: 'span', _key: key(), text: token.slice(2, -2), marks: ['strong'] })
    else if (m[2]) children.push({ _type: 'span', _key: key(), text: token.slice(1, -1), marks: ['code'] })
    else if (m[3]) {
      const [, label, href] = /^\[(.+?)\]\((.+?)\)$/.exec(token)
      const defKey = key()
      markDefs.push({ _type: 'link', _key: defKey, href })
      children.push({ _type: 'span', _key: key(), text: label, marks: [defKey] })
    } else children.push({ _type: 'span', _key: key(), text: token.slice(1, -1), marks: ['em'] })
    last = m.index + token.length
  }
  plain(text.slice(last))
  if (!children.length) children.push({ _type: 'span', _key: key(), text: '', marks: [] })
  return { children, markDefs }
}

export function inlineToText(block) {
  const defs = new Map((block.markDefs || []).map((d) => [d._key, d]))
  return (block.children || [])
    .map((c) => {
      let t = c.text || ''
      const marks = c.marks || []
      if (marks.includes('code')) t = `\`${t}\``
      if (marks.includes('strong')) t = `**${t}**`
      if (marks.includes('em')) t = `*${t}*`
      marks.forEach((m) => {
        const d = defs.get(m)
        if (d && d._type === 'link') t = `[${t}](${d.href})`
      })
      return t
    })
    .join('')
}

const textBlock = (style, text, extra = {}) => {
  const { children, markDefs } = parseInline(text)
  return { _type: 'block', _key: key(), style, markDefs, children, ...extra }
}

const isSpecial = (l) =>
  /^```/.test(l) || /^#{2,3}\s/.test(l) || /^[-*]\s/.test(l) || /^\d+\.\s/.test(l) || /^>\s?/.test(l) || /^!\[.*?\]\(\S+?\)\s*$/.test(l.trim())

export function textToBlocks(input) {
  const lines = String(input || '').replace(/\r\n/g, '\n').split('\n')
  const blocks = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (!line.trim()) {
      i++
      continue
    }
    const fence = /^```(\w*)\s*$/.exec(line)
    if (fence) {
      const code = []
      i++
      while (i < lines.length && !/^```\s*$/.test(lines[i])) code.push(lines[i++])
      i++ // closing fence
      blocks.push({ _type: 'code', _key: key(), language: fence[1] || '', code: code.join('\n') })
      continue
    }
    const img = /^!\[(.*?)\]\((\S+?)\)\s*$/.exec(line.trim())
    if (img) {
      blocks.push({ _type: 'image', _key: key(), alt: img[1], url: img[2] })
      i++
      continue
    }
    const head = /^(#{2,3})\s+(.*)$/.exec(line)
    if (head) {
      blocks.push(textBlock(head[1].length === 2 ? 'h2' : 'h3', head[2].trim()))
      i++
      continue
    }
    if (/^[-*]\s/.test(line)) {
      while (i < lines.length && /^[-*]\s/.test(lines[i])) {
        blocks.push(textBlock('normal', lines[i].replace(/^[-*]\s+/, '').trim(), { listItem: 'bullet', level: 1 }))
        i++
      }
      continue
    }
    if (/^\d+\.\s/.test(line)) {
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        blocks.push(textBlock('normal', lines[i].replace(/^\d+\.\s+/, '').trim(), { listItem: 'number', level: 1 }))
        i++
      }
      continue
    }
    if (/^>\s?/.test(line)) {
      const q = []
      while (i < lines.length && /^>\s?/.test(lines[i])) q.push(lines[i++].replace(/^>\s?/, ''))
      blocks.push(textBlock('blockquote', q.join('\n')))
      continue
    }
    const para = []
    while (i < lines.length && lines[i].trim() && (para.length === 0 || !isSpecial(lines[i]))) para.push(lines[i++])
    blocks.push(textBlock('normal', para.join('\n')))
  }
  return blocks
}

export function blocksToText(blocks) {
  if (!Array.isArray(blocks)) return ''
  const parts = []
  let prevList = null
  blocks.forEach((b, idx) => {
    let line
    let list = null
    if (b._type === 'code') line = `\`\`\`${b.language || ''}\n${b.code || ''}\n\`\`\``
    else if (b._type === 'image') line = `![${b.alt || ''}](${b.url})`
    else {
      const t = inlineToText(b)
      if (b.listItem) {
        list = b.listItem
        line = b.listItem === 'number' ? `1. ${t}` : `- ${t}`
      } else if (b.style === 'h2') line = `## ${t}`
      else if (b.style === 'h3') line = `### ${t}`
      else if (b.style === 'blockquote') line = t.split('\n').map((l) => `> ${l}`).join('\n')
      else line = t
    }
    const tight = list && prevList === list
    parts.push((idx === 0 ? '' : tight ? '\n' : '\n\n') + line)
    prevList = list
  })
  return parts.join('')
}

export const plainText = (blocks) =>
  flattenBlocks(blocks).map((b) => (b._type === 'block' ? (b.children || []).map((c) => c.text || '').join('') : '')).join(' ')

export const wordCount = (blocks) => plainText(blocks).split(/\s+/).filter(Boolean).length
