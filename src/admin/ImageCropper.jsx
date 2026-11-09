import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { RotateCcw, RotateCw, Undo2 } from 'lucide-react'

// Crop and rotate a photo before it uploads. Opens for every single image you
// pick, paste or drop (not for several at once, and not for GIFs, which would
// lose their animation). "Use photo" with nothing changed uploads the original
// file untouched; otherwise the edited picture is handed to the usual upload,
// which still shrinks and converts it to WebP.
//
// The crop box is kept as fractions (0 to 1) of the rotated picture, so it
// does not care how big the picture is drawn on screen.

const MIN = 0.05 // the crop box is never smaller than 5% of either side
const MAX_OUT = 3200 // the upload shrinks to 1600 anyway; this only caps memory use
const RATIOS = [
  { id: 'free', label: 'Free' },
  { id: 'original', label: 'Original' },
  { id: 1, label: 'Square' },
  { id: 16 / 9, label: '16:9' },
  { id: 4 / 3, label: '4:3' },
]
const FULL = { x: 0, y: 0, w: 1, h: 1 }

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))
const rotatedSize = (bmp, rotation) => (rotation % 180 ? [bmp.height, bmp.width] : [bmp.width, bmp.height])

// The largest box of `ratio` (width / height, in pixels) centred in the picture.
function fitRatio(ratio, rw, rh) {
  if (!ratio) return FULL
  const k = rw / (rh * ratio) // box height as a fraction, for a box width of 1
  return k <= 1 ? { x: 0, y: (1 - k) / 2, w: 1, h: k } : { x: (1 - 1 / k) / 2, y: 0, w: 1 / k, h: 1 }
}

// Draws the picture rotated, then cropped, at `scale`.
function draw(ctx, bmp, rotation, crop, scale) {
  const [rw, rh] = rotatedSize(bmp, rotation)
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
  ctx.scale(scale, scale)
  ctx.translate(-crop.x * rw, -crop.y * rh)
  ctx.translate(rw / 2, rh / 2)
  ctx.rotate((rotation * Math.PI) / 180)
  ctx.drawImage(bmp, -bmp.width / 2, -bmp.height / 2)
}

async function exportFile(file, bmp, rotation, crop) {
  const [rw, rh] = rotatedSize(bmp, rotation)
  const sw = crop.w * rw
  const sh = crop.h * rh
  const scale = Math.min(1, MAX_OUT / Math.max(sw, sh))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(sw * scale))
  canvas.height = Math.max(1, Math.round(sh * scale))
  draw(canvas.getContext('2d'), bmp, rotation, crop, scale)
  const toBlob = (type, q) => new Promise((resolve) => canvas.toBlob(resolve, type, q))
  // High quality here: the upload re-encodes it once more at its usual setting.
  let blob = await toBlob('image/webp', 0.95)
  let ext = 'webp'
  if (!blob || blob.type !== 'image/webp') {
    blob = await toBlob('image/png')
    ext = 'png'
  }
  if (!blob) throw new Error('Could not edit this photo. Use the original instead.')
  const base = (file.name || 'photo').replace(/\.[^.]+$/, '')
  return new File([blob], `${base}.${ext}`, { type: blob.type })
}

export default function ImageCropper({ file, onDone }) {
  const [bmp, setBmp] = useState(null)
  const [failed, setFailed] = useState(null)
  const [rotation, setRotation] = useState(0)
  const [ratio, setRatio] = useState('free')
  const [crop, setCrop] = useState(FULL)
  const [busy, setBusy] = useState(false)
  const [closing, setClosing] = useState(false)
  const stageRef = useRef(null)
  const canvasRef = useRef(null)
  const frameRef = useRef(null)
  const [box, setBox] = useState({ w: 0, h: 0 }) // room available for the picture
  const drag = useRef(null)

  useEffect(() => {
    let gone = false
    createImageBitmap(file)
      .then((b) => (gone ? b.close?.() : setBmp(b)))
      .catch(() => !gone && setFailed('This photo cannot be edited here. You can still upload it as it is.'))
    return () => {
      gone = true
    }
  }, [file])
  useEffect(() => () => bmp?.close?.(), [bmp])

  // The phone's Back cancels, like closing any other screen.
  const doneRef = useRef(false)
  const finish = useCallback(
    (result) => {
      if (doneRef.current) return // answered once already (a button, then Back's popstate)
      doneRef.current = true
      setClosing(true)
      if (window.history.state?.adminCrop) window.history.back()
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      setTimeout(() => onDone(result), reduce ? 0 : 160)
    },
    [onDone]
  )
  const finishRef = useRef(finish)
  finishRef.current = finish
  useEffect(() => {
    window.history.pushState({ ...(window.history.state || {}), adminCrop: true }, '', window.location.href)
    const onPop = () => {
      if (!window.history.state?.adminCrop) finishRef.current(null)
    }
    window.addEventListener('popstate', onPop)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('popstate', onPop)
      document.body.style.overflow = prev
    }
  }, [])

  useLayoutEffect(() => {
    const el = stageRef.current
    if (!el) return
    // Leave room round the picture so the corner handles stay easy to grab.
    const measure = () => setBox({ w: Math.max(0, el.clientWidth - 40), h: Math.max(0, el.clientHeight - 40) })
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const [rw, rh] = bmp ? rotatedSize(bmp, rotation) : [1, 1]
  const scale = bmp && box.w && box.h ? Math.min(box.w / rw, box.h / rh) : 0
  const dispW = Math.round(rw * scale)
  const dispH = Math.round(rh * scale)
  const ratioValue = ratio === 'free' ? null : ratio === 'original' ? bmp && bmp.width / bmp.height : ratio

  // Draw the whole rotated picture once per size or rotation; the crop box is a layer on top.
  useEffect(() => {
    const c = canvasRef.current
    if (!c || !bmp || !dispW) return
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    c.width = Math.round(dispW * dpr)
    c.height = Math.round(dispH * dpr)
    draw(c.getContext('2d'), bmp, rotation, FULL, scale * dpr)
  }, [bmp, rotation, dispW, dispH, scale])

  function rotate(by) {
    if (!bmp) return
    const next = (rotation + by + 360) % 360
    setRotation(next)
    const [nw, nh] = rotatedSize(bmp, next)
    setCrop(fitRatio(ratioValue, nw, nh))
  }

  function pickRatio(id) {
    setRatio(id)
    const value = id === 'free' ? null : id === 'original' ? bmp && bmp.width / bmp.height : id
    setCrop(fitRatio(value, rw, rh))
  }

  function reset() {
    setRotation(0)
    setRatio('free')
    setCrop(FULL)
  }

  // ---- dragging the box (move) or a corner (resize) ----
  function onPointerDown(e, corner) {
    if (e.button !== undefined && e.button !== 0) return
    e.preventDefault()
    e.stopPropagation()
    e.currentTarget.setPointerCapture?.(e.pointerId)
    drag.current = { corner, x: e.clientX, y: e.clientY, start: crop }
  }

  function onPointerMove(e) {
    const d = drag.current
    if (!d || !dispW) return
    const dx = (e.clientX - d.x) / dispW
    const dy = (e.clientY - d.y) / dispH
    const s = d.start
    if (!d.corner) {
      setCrop({ ...s, x: clamp(s.x + dx, 0, 1 - s.w), y: clamp(s.y + dy, 0, 1 - s.h) })
      return
    }
    const west = d.corner.includes('w')
    const north = d.corner.includes('n')
    // The opposite corner stays put.
    const ax = west ? s.x + s.w : s.x
    const ay = north ? s.y + s.h : s.y
    const maxW = west ? ax : 1 - ax
    const maxH = north ? ay : 1 - ay
    let w = clamp((west ? -1 : 1) * dx + s.w, MIN, maxW)
    let h = clamp((north ? -1 : 1) * dy + s.h, MIN, maxH)
    if (ratioValue) {
      const k = rw / (rh * ratioValue)
      h = w * k
      if (h > maxH) {
        h = maxH
        w = h / k
      }
      if (h < MIN) {
        h = MIN
        w = h / k
      }
    }
    setCrop({ x: west ? ax - w : ax, y: north ? ay - h : ay, w, h })
  }

  function onPointerUp() {
    drag.current = null
  }

  // Arrow keys move the box (Shift for bigger steps).
  function onFrameKey(e) {
    const step = e.shiftKey ? 0.05 : 0.01
    const moves = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }
    const m = moves[e.key]
    if (!m) return
    e.preventDefault()
    setCrop((c) => ({ ...c, x: clamp(c.x + m[0], 0, 1 - c.w), y: clamp(c.y + m[1], 0, 1 - c.h) }))
  }

  const changed = rotation !== 0 || crop.x > 0.001 || crop.y > 0.001 || crop.w < 0.999 || crop.h < 0.999
  const outW = bmp ? Math.round(crop.w * rw) : 0
  const outH = bmp ? Math.round(crop.h * rh) : 0

  async function use() {
    if (!bmp || !changed) return finish(file)
    setBusy(true)
    try {
      finish(await exportFile(file, bmp, rotation, crop))
    } catch {
      setFailed('Could not edit this photo. You can still upload it as it is.')
      setBusy(false)
    }
  }

  function onKeyDown(e) {
    if (e.key === 'Escape') {
      e.stopPropagation()
      finish(null)
    }
  }

  return createPortal(
    <div className={`admin-cropper-backdrop ${closing ? 'is-closing' : ''}`} onKeyDown={onKeyDown}>
      <div className="admin-cropper" role="dialog" aria-modal="true" aria-labelledby="admin-cropper-title">
        <header className="admin-cropper-head">
          <h2 id="admin-cropper-title">Edit photo</h2>
          <p className="admin-hint">
            {failed || (bmp ? `Drag the box or its corners to crop. ${outW} × ${outH} px` : 'Opening the photo…')}
          </p>
        </header>

        <div className="admin-cropper-stage" ref={stageRef} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
          {bmp && dispW > 0 && (
            <div className="admin-cropper-canvas" style={{ width: dispW, height: dispH }}>
              <canvas ref={canvasRef} style={{ width: dispW, height: dispH }} aria-hidden="true" />
              <div
                ref={frameRef}
                className="admin-cropper-frame"
                style={{ left: crop.x * dispW, top: crop.y * dispH, width: crop.w * dispW, height: crop.h * dispH }}
                onPointerDown={(e) => onPointerDown(e, null)}
                onKeyDown={onFrameKey}
                tabIndex={0}
                role="group"
                aria-label="Crop area. Use the arrow keys to move it."
              >
                <i className="admin-cropper-thirds" aria-hidden="true" />
                {['nw', 'ne', 'sw', 'se'].map((c) => (
                  <span key={c} className={`admin-cropper-handle is-${c}`} onPointerDown={(e) => onPointerDown(e, c)} aria-hidden="true" />
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="admin-cropper-tools">
          <div className="admin-cropper-rotate">
            <button type="button" className="admin-icon-btn" onClick={() => rotate(-90)} disabled={!bmp} aria-label="Rotate left">
              <RotateCcw size={18} aria-hidden="true" />
            </button>
            <button type="button" className="admin-icon-btn" onClick={() => rotate(90)} disabled={!bmp} aria-label="Rotate right">
              <RotateCw size={18} aria-hidden="true" />
            </button>
            <button type="button" className="admin-icon-btn" onClick={reset} disabled={!bmp || !changed} aria-label="Undo all changes">
              <Undo2 size={18} aria-hidden="true" />
            </button>
          </div>
          <div className="admin-cropper-ratios" role="radiogroup" aria-label="Crop shape">
            {RATIOS.map((r) => (
              <button
                key={r.label}
                type="button"
                role="radio"
                aria-checked={ratio === r.id}
                className={`admin-cropper-ratio ${ratio === r.id ? 'is-on' : ''}`}
                onClick={() => pickRatio(r.id)}
                disabled={!bmp}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        <div className="admin-cropper-actions">
          <button type="button" className="admin-btn-ghost" onClick={() => finish(null)} disabled={busy}>
            Cancel
          </button>
          <button type="button" className="admin-btn" onClick={use} disabled={busy || (!bmp && !failed)} autoFocus>
            {busy ? 'Preparing…' : failed && !bmp ? 'Upload as it is' : 'Use photo'}
          </button>
        </div>
      </div>
    </div>,
    document.querySelector('.admin-page') || document.body
  )
}
