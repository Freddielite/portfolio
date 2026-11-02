// Browser-side image handling for the admin. Every upload becomes a permanent
// blob in the repo's git history, so images are shrunk and re-encoded before they
// leave the device. WebP is used when the browser can encode it (smaller than
// JPEG at the same quality, and it keeps transparency), otherwise JPEG or PNG.
// GIFs pass through untouched because redrawing would flatten the animation.
const MAX_DIMENSION = 1600
const QUALITY = 0.82

const toBlob = (canvas, type, quality) => new Promise((resolve) => canvas.toBlob(resolve, type, quality))

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('Could not read that file.'))
    reader.readAsDataURL(file)
  })
}

// A 20px wide blurred stand-in, a few hundred bytes, shown while the real image loads.
async function makeLqip(bitmap) {
  const w = 20
  const h = Math.max(1, Math.round((bitmap.height * w) / bitmap.width))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, w, h)
  ctx.drawImage(bitmap, 0, 0, w, h)
  return canvas.toDataURL('image/jpeg', 0.45)
}

export async function prepareImage(file) {
  if (file.type === 'image/gif') {
    return { file, originalSize: file.size, size: file.size, lqip: null }
  }
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height))
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  canvas.getContext('2d').drawImage(bitmap, 0, 0, width, height)
  const lqip = await makeLqip(bitmap).catch(() => null)
  bitmap.close?.()

  let blob = await toBlob(canvas, 'image/webp', QUALITY)
  let ext = 'webp'
  if (!blob || blob.type !== 'image/webp') {
    const keepPng = file.type === 'image/png'
    blob = await toBlob(canvas, keepPng ? 'image/png' : 'image/jpeg', keepPng ? undefined : QUALITY)
    ext = keepPng ? 'png' : 'jpg'
  }
  // Keep the original if re-encoding somehow made it bigger.
  if (!blob || blob.size >= file.size) {
    return { file, originalSize: file.size, size: file.size, lqip, width: bitmap.width, height: bitmap.height }
  }
  const base = file.name.replace(/\.[^.]+$/, '')
  return {
    file: new File([blob], `${base}.${ext}`, { type: blob.type }),
    originalSize: file.size,
    size: blob.size,
    lqip,
    width,
    height,
  }
}

export async function uploadImage(file, folder = 'uploads') {
  const prepared = await prepareImage(file).catch(() => ({ file, originalSize: file.size, size: file.size, lqip: null }))
  const dataUrl = await readAsDataUrl(prepared.file)
  const res = await fetch('/api/admin/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename: prepared.file.name, dataUrl, folder }),
  })
  const body = await res.json()
  if (!res.ok) throw new Error(body.error || 'Upload failed.')
  return { path: body.path, lqip: prepared.lqip, originalSize: prepared.originalSize, size: prepared.size }
}

export const prettySize = (n) => (n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`)
