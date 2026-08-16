import { useRef, useState } from 'react'

const MAX_DIMENSION = 1600 // px, longest side
const JPEG_QUALITY = 0.82

// Downscales + re-encodes an image file in the browser before it ever
// leaves the device. Every upload here becomes a permanent blob in the
// repo's git history via the GitHub Contents API — even after the file is
// later replaced or removed from content.json, the old blob stays in
// history — so keeping originals from a phone camera (often several MB) out
// of the repo matters more here than in a normal upload flow.
//
// GIFs are passed through untouched: redrawing to a canvas would flatten
// any animation to a single frame, which is a worse trade than the repo
// bloat this function exists to avoid.
async function compressImage(file) {
  if (file.type === 'image/gif') return file

  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height))
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close?.()

  // PNGs often carry a real alpha channel (logos, icons) — keep transparency
  // by staying in PNG for those instead of flattening onto a JPEG.
  const outputType = file.type === 'image/png' ? 'image/png' : 'image/jpeg'
  const blob = await new Promise((resolve) =>
    canvas.toBlob(resolve, outputType, outputType === 'image/jpeg' ? JPEG_QUALITY : undefined)
  )

  // Fall back to the original if compression somehow made it bigger (e.g.
  // an already-tiny or already-compressed source) or failed outright.
  if (!blob || blob.size >= file.size) return file

  const ext = outputType === 'image/png' ? 'png' : 'jpg'
  const base = file.name.replace(/\.[^.]+$/, '')
  return new File([blob], `${base}.${ext}`, { type: outputType })
}

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
      const uploadFile = await compressImage(file).catch(() => file)
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.onerror = () => reject(new Error('Could not read that file.'))
        reader.readAsDataURL(uploadFile)
      })
      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: uploadFile.name, dataUrl, folder }),
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
