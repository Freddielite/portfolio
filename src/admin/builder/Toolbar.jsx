import { useRef, useState } from 'react'
import { uploadImage } from '../imageUpload.js'
import * as act from './actions.js'

// Formatting buttons for the post editor. Works on the textarea passed in `area`
// and hands the new text back through `onText`.
export default function Toolbar({ area, text, onText, onImages, uploading = false }) {
  const fileRef = useRef(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  function run(fn) {
    const ta = area.current
    if (!ta) return
    const result = fn(ta.value, ta.selectionStart, ta.selectionEnd)
    onText(result.value)
    requestAnimationFrame(() => {
      ta.focus()
      ta.setSelectionRange(result.start, result.end)
    })
  }

  async function addImage(file) {
    if (!file) return
    setBusy(true)
    setError(null)
    try {
      const { path } = await uploadImage(file, 'blog')
      run((v, s, e) => act.insertAt(v, s, e, `![Describe this image](${path})`))
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const buttons = [
    ['B', 'Bold (Ctrl+B)', (v, s, e) => act.wrap(v, s, e, '**', '**', 'bold text'), 'tb-bold'],
    ['I', 'Italic (Ctrl+I)', (v, s, e) => act.wrap(v, s, e, '*', '*', 'italic text'), 'tb-italic'],
    ['Link', 'Link (Ctrl+K)', act.link],
    ['H2', 'Heading', (v, s, e) => act.heading(v, s, e, 2)],
    ['H3', 'Smaller heading', (v, s, e) => act.heading(v, s, e, 3)],
    ['• List', 'Bullet list', (v, s, e) => act.prefixLines(v, s, e, '- ')],
    ['1. List', 'Numbered list', (v, s, e) => act.prefixLines(v, s, e, '1. ', /^\d+\.\s/)],
    ['Quote', 'Quote', (v, s, e) => act.prefixLines(v, s, e, '> ')],
    ['</>', 'Inline code', (v, s, e) => act.wrap(v, s, e, '`', '`', 'code')],
    ['{ }', 'Code block', act.codeBlock],
  ]

  return (
    <div className="builder-toolbar" role="toolbar" aria-label="Formatting">
      {buttons.map(([label, title, fn, cls]) => (
        <button key={label} type="button" title={title} className={cls} onMouseDown={(e) => e.preventDefault()} onClick={() => run(fn)}>
          {label}
        </button>
      ))}
      <button type="button" title="Insert image" disabled={busy || uploading} onMouseDown={(e) => e.preventDefault()} onClick={() => fileRef.current?.click()}>
        {busy || uploading ? 'Uploading…' : 'Image'}
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple={!!onImages}
        hidden
        onChange={(e) => {
          if (onImages) {
            const files = [...(e.target.files || [])]
            e.target.value = ''
            if (files.length) onImages(files)
          } else addImage(e.target.files?.[0])
        }}
      />
      {error && <span className="admin-error">{error}</span>}
    </div>
  )
}

// Keyboard shortcuts and image paste for the textarea.
export function editorHandlers({ run, addImageFile }) {
  return {
    onKeyDown(e) {
      if (!(e.ctrlKey || e.metaKey)) return
      const k = e.key.toLowerCase()
      if (k === 'b') {
        e.preventDefault()
        run((v, s, en) => act.wrap(v, s, en, '**', '**', 'bold text'))
      } else if (k === 'i') {
        e.preventDefault()
        run((v, s, en) => act.wrap(v, s, en, '*', '*', 'italic text'))
      } else if (k === 'k') {
        e.preventDefault()
        run(act.link)
      }
    },
    onPaste(e) {
      const file = [...(e.clipboardData?.files || [])].find((f) => f.type.startsWith('image/'))
      if (file) {
        e.preventDefault()
        addImageFile(file)
      }
    },
  }
}
