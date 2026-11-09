import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import { getFile, putFile } from './github.js'

// Phones that get alerts (Android app, "Phone alerts" on the Overview). Each
// phone holds a random token that can only READ the alert status: it cannot
// sign in, see content or change anything. Only a hash of it is kept here, in
// the repo, like the fingerprint devices.
const PATH = 'security/alerts.json'

export async function readAlertDevices() {
  const { content, sha } = await getFile(PATH)
  let list = []
  try {
    list = content ? JSON.parse(content) : []
  } catch {
    list = []
  }
  return { list: Array.isArray(list) ? list : [], sha }
}

export const writeAlertDevices = (list, sha, message) => putFile(PATH, JSON.stringify(list, null, 2) + '\n', sha, message)

export const newId = () => randomBytes(12).toString('base64url')
export const newToken = () => randomBytes(32).toString('base64url')
export const hashToken = (token) => createHash('sha256').update(String(token)).digest('hex')

export function sameHash(a, b) {
  const x = Buffer.from(String(a || ''), 'hex')
  const y = Buffer.from(String(b || ''), 'hex')
  return x.length === 32 && x.length === y.length && timingSafeEqual(x, y)
}

// "Bearer <id>.<token>" -> { id, token } or null
export function readBearer(req) {
  const m = /^Bearer\s+([A-Za-z0-9_-]{16,64})\.([A-Za-z0-9_-]{32,128})$/.exec(String(req.headers.authorization || ''))
  return m ? { id: m[1], token: m[2] } : null
}
