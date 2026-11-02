// Text edits for the editor toolbar. Each takes the textarea's value and
// selection and returns { value, start, end } for the new value and selection.
export function wrap(value, s, e, before, after = before, placeholder = 'text') {
  const sel = value.slice(s, e) || placeholder
  const out = value.slice(0, s) + before + sel + after + value.slice(e)
  return { value: out, start: s + before.length, end: s + before.length + sel.length }
}

function lineRange(value, s, e) {
  const start = value.lastIndexOf('\n', s - 1) + 1
  let end = value.indexOf('\n', e)
  if (end === -1) end = value.length
  return [start, end]
}

// Adds a prefix to every selected line, or removes it if they all have it.
export function prefixLines(value, s, e, prefix, strip = null) {
  const [a, b] = lineRange(value, s, e)
  const lines = value.slice(a, b).split('\n')
  const has = lines.every((l) => l.startsWith(prefix))
  const next = lines.map((l, i) => {
    let line = strip ? l.replace(strip, '') : l
    if (has) return line.slice(prefix.length)
    return (prefix === '1. ' ? `${i + 1}. ` : prefix) + line
  })
  const text = next.join('\n')
  return { value: value.slice(0, a) + text + value.slice(b), start: a, end: a + text.length }
}

export function heading(value, s, e, level) {
  const prefix = `${'#'.repeat(level)} `
  const [a, b] = lineRange(value, s, e)
  const line = value.slice(a, b)
  const already = line.startsWith(prefix)
  const text = already ? line.slice(prefix.length) : prefix + line.replace(/^#{1,6}\s+/, '')
  return { value: value.slice(0, a) + text + value.slice(b), start: a, end: a + text.length }
}

export function link(value, s, e) {
  const sel = value.slice(s, e) || 'link text'
  const out = value.slice(0, s) + `[${sel}](https://)` + value.slice(e)
  const urlStart = s + sel.length + 3
  return { value: out, start: urlStart, end: urlStart + 8 }
}

export function codeBlock(value, s, e) {
  const sel = value.slice(s, e) || 'code here'
  const pre = s > 0 && value[s - 1] !== '\n' ? '\n\n' : ''
  const out = value.slice(0, s) + `${pre}\`\`\`\n${sel}\n\`\`\`\n` + value.slice(e)
  const start = s + pre.length + 4
  return { value: out, start, end: start + sel.length }
}

export function insertAt(value, s, e, text) {
  const pre = s > 0 && value[s - 1] !== '\n' ? '\n\n' : ''
  const out = value.slice(0, s) + pre + text + '\n' + value.slice(e)
  const end = s + pre.length + text.length
  return { value: out, start: end, end }
}
