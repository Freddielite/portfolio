import { useRef, useState } from 'react'

// Like ImageUploader, but for a single file that always lives at one fixed
// path on the server (e.g. the resume at /cv.pdf) — every upload replaces
// it in place rather than getting its own new URL, so `value` here is just
// used to show/hide the "current file" link, not stored back into content.
export default function FileUploader({ value, onChange, folder, label = 'File', accept, cacheBust = true, hint }) {
  const inputRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError(null)
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.onerror = () => reject(new Error('Could not read that file.'))
        reader.readAsDataURL(file)
      })
      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, dataUrl, folder }),
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || 'Upload failed.')
      // Bust caches (browser + CDN) since the URL itself doesn't change.
      onChange(cacheBust ? `${body.path}?v=${Date.now()}` : body.path)
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="admin-field">
      <label className="admin-label">{label}</label>
      <div className="admin-image-row">
        {value ? (
          <a href={value} target="_blank" rel="noreferrer" className="admin-image-preview admin-image-empty">
            View current
          </a>
        ) : (
          <div className="admin-image-preview admin-image-empty">No file</div>
        )}
        <div className="admin-image-controls">
          <input ref={inputRef} type="file" accept={accept} onChange={handleFile} disabled={uploading} />
          {uploading && <p className="admin-hint">Uploading…</p>}
          {error && <p className="admin-error">{error}</p>}
          {hint && !uploading && !error && <p className="admin-hint">{hint}</p>}
        </div>
      </div>
    </div>
  )
}
