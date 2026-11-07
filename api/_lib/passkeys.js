import { getFile, putFile } from './github.js'

// Registered passkeys (fingerprint / face unlock) live in the repo, like the
// rest of the admin's data. Each entry holds a credential id and a PUBLIC key:
// public keys are made to be shared, and cannot be used to unlock anything.
const PATH = 'security/passkeys.json'

export async function readPasskeys() {
  const { content, sha } = await getFile(PATH)
  let list = []
  try {
    list = content ? JSON.parse(content) : []
  } catch {
    list = []
  }
  return { list: Array.isArray(list) ? list : [], sha }
}

export async function writePasskeys(list, sha, message) {
  return putFile(PATH, JSON.stringify(list, null, 2) + '\n', sha, message)
}

// The site's own address. Passkeys are tied to it, so they only work on the
// domain they were made on (not on preview deployments).
export function relyingParty(req) {
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim()
  const rpID = host.split(':')[0]
  const local = rpID === 'localhost' || rpID === '127.0.0.1'
  return { rpID, origins: local ? [`http://${host}`, `https://${host}`] : [`https://${host}`] }
}
