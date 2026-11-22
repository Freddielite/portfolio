import { useEffect, useRef, useState } from 'react'
import { Images, ImageOff } from 'lucide-react'
import { adminFetch } from './http.js'
import { PopupSurface, usePopup } from './Popup.jsx'
import { readCache, writeCache } from './cache.js'

// "From library": pick a picture that is already in the repo instead of uploading it
// again. Uses the quick listing (no "used by" check), so it opens fast.

function Tile({ img, current, onPick }) {
  const [failed, setFailed] = useState(false)
  return (
    <button type="button" className={`admin-lib-tile ${img.path === current ? 'is-current' : ''}`} onClick={() => onPick(img.path)} aria-label={`Use ${img.name}`} aria-pressed={img.path === current}>
      {failed ? <ImageOff size={18} aria-hidden="true" /> : <img src={img.path} alt="" loading="lazy" decoding="async" onError={() => setFailed(true)} />}
    </button>
  )
}

function Grid({ current, onPick, onCancel }) {
  const cached = useRef(readCache('images-light'))
  const [state, setState] = useState({ loading: true, error: null, images: cached.current?.value?.images || null })

  useEffect(() => {
    let live = true
    adminFetch('/api/admin/upload?light=1', { cache: 'no-store' })
      .then(async (res) => {
        const body = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(body.error || 'Could not load your images.')
        return body
      })
      .then((body) => {
        if (!live) return
        writeCache('images-light', body)
        setState({ loading: false, error: null, images: body.images })
      })
      .catch((err) => live && setState((s) => ({ ...s, loading: false, error: err.message })))
    return () => {
      live = false
    }
  }, [])

  const { images } = state
  return (
    <div className="admin-lib-picker">
      {state.error && <p className="admin-error">{state.error}</p>}
      {!images && state.loading && <p className="admin-hint admin-lib-note">Reading your repo…</p>}
      {images && !images.length && <p className="admin-hint admin-lib-note">No images yet. Upload one first and it will be here next time.</p>}
      {images?.length > 0 && (
        <div className="admin-lib-grid">
          {images.map((img) => <Tile key={img.path} img={img} current={current} onPick={onPick} />)}
        </div>
      )}
      <div className="admin-lib-picker-foot">
        <button type="button" className="admin-btn-ghost" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  )
}

export default function LibraryButton({ onPick, current, disabled }) {
  const btnRef = useRef(null)
  const { open, show, hide } = usePopup(btnRef)
  return (
    <>
      <button ref={btnRef} type="button" className="admin-btn-ghost admin-btn-icon-text" aria-haspopup="dialog" aria-expanded={open} onClick={show} disabled={disabled}>
        <Images size={15} aria-hidden="true" /> From library
      </button>
      {open && (
        <PopupSurface asSheet label="Choose an image" anchor={btnRef} onClose={hide} className="admin-lib-pop">
          {(close) => <Grid current={current} onPick={(path) => close(() => { hide(); onPick(path) })} onCancel={() => close(() => hide())} />}
        </PopupSurface>
      )}
    </>
  )
}
