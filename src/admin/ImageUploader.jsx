import { useRef, useState } from 'react'

export default function ImageUploader({ value, onChange, folder = 'uploads', label = 'Image' }) {
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
      onChange(body.path)
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
          <img src={value} alt="" className="admin-image-preview" />
        ) : (
          <div className="admin-image-preview admin-image-empty">No image</div>
        )}
        <div className="admin-image-controls">
          <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} disabled={uploading} />
          {value && (
            <button type="button" className="admin-btn-ghost" onClick={() => onChange(null)}>
              Remove image
            </button>
          )}
          {uploading && <p className="admin-hint">Uploading…</p>}
          {error && <p className="admin-error">{error}</p>}
        </div>
      </div>
    </div>
  )
}
