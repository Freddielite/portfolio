import { useRef, useState } from 'react'
import { prettySize, uploadImage } from './imageUpload.js'
import { useAdmin } from './AdminContext.jsx'

// Upload, optimise and preview one image. `onChange(path, { lqip })` fires after
// an upload (null when removed). Pass `alt` and `onAltChange` to add an alt text
// field, which is read aloud by screen readers and used by search engines.
export default function ImageUploader({ value, onChange, folder = 'uploads', label = 'Image', alt, onAltChange }) {
  const inputRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)
  const [saved, setSaved] = useState(null)
  const admin = useAdmin()

  async function handleFile(e) {
    const picked = e.target.files?.[0]
    if (!picked) return
    // Crop and rotate first; cancelling uploads nothing.
    const file = admin?.editImage ? await admin.editImage(picked) : picked
    if (!file) {
      if (inputRef.current) inputRef.current.value = ''
      return
    }
    setUploading(true)
    setError(null)
    setSaved(null)
    try {
      const result = await uploadImage(file, folder)
      if (result.size < result.originalSize) {
        setSaved(`Optimised: ${prettySize(result.originalSize)} to ${prettySize(result.size)} (${Math.round((1 - result.size / result.originalSize) * 100)}% smaller)`)
      }
      onChange(result.path, { lqip: result.lqip })
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
            <button type="button" className="admin-btn-ghost" onClick={() => onChange(null, { lqip: null })}>
              Remove image
            </button>
          )}
          {uploading && <p className="admin-hint">Optimising and uploading…</p>}
          {saved && <p className="admin-hint">{saved}</p>}
          {error && <p className="admin-error">{error}</p>}
        </div>
      </div>
      {onAltChange && value && (
        <div className="admin-alt">
          <input
            value={alt || ''}
            onChange={(e) => onAltChange(e.target.value)}
            placeholder="Alt text: describe the image for people who cannot see it"
            aria-label={`${label} alt text`}
          />
          {!alt && <p className="admin-hint">Missing alt text. Add a short description.</p>}
        </div>
      )}
    </div>
  )
}
