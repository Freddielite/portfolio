// Thin wrapper around the GitHub Contents API. This is the entire "database"
// for the admin panel: every save is a real git commit to the repo, which is
// what triggers Vercel's normal auto-deploy, no separate CMS, no separate
// dataset, nothing else to keep in sync.

const API = 'https://api.github.com'

function env() {
  const { GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO, GITHUB_BRANCH } = process.env
  if (!GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO) {
    throw new Error(
      'GITHUB_TOKEN, GITHUB_OWNER and GITHUB_REPO must all be set in the Vercel project env vars.'
    )
  }
  return { GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO, GITHUB_BRANCH: GITHUB_BRANCH || 'main' }
}

function headers(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  }
}

// Returns { content, sha } with content decoded as utf-8 text, or throws.
// If the file doesn't exist, returns { content: null, sha: null } instead of
// throwing, so callers can tell "file missing" apart from "request failed".
//
// GitHub can answer `contents?ref=<branch>` from a cache for a while after a
// commit, which made the admin's Re-check show old data. Reading the file at
// the branch's exact head commit avoids that; if the head lookup fails we fall
// back to the branch name.
async function headSha() {
  const { GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO, GITHUB_BRANCH } = env()
  try {
    const res = await fetch(
      `${API}/repos/${GITHUB_OWNER}/${GITHUB_REPO}/git/ref/heads/${encodeURIComponent(GITHUB_BRANCH)}`,
      { headers: headers(GITHUB_TOKEN), cache: 'no-store' }
    )
    if (!res.ok) return null
    const body = await res.json()
    return body?.object?.sha || null
  } catch {
    return null
  }
}

export async function getFile(path) {
  const { GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO, GITHUB_BRANCH } = env()
  const ref = (await headSha()) || GITHUB_BRANCH
  const url = `${API}/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}?ref=${encodeURIComponent(ref)}`
  const res = await fetch(url, { headers: headers(GITHUB_TOKEN), cache: 'no-store' })
  if (res.status === 404) return { content: null, sha: null }
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`GitHub GET ${path} failed (${res.status}): ${body}`)
  }
  const data = await res.json()
  const content = Buffer.from(data.content, 'base64').toString('utf-8')
  return { content, sha: data.sha }
}

// content: utf-8 string (isBase64: false, default) or already-base64 data
// (isBase64: true, used for image uploads). sha: pass the current file's
// sha to update it, or omit/undefined to create a new file.
export async function putFile(path, content, sha, message, { isBase64 = false } = {}) {
  const { GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO, GITHUB_BRANCH } = env()
  const url = `${API}/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}`
  const base64Content = isBase64 ? content : Buffer.from(content, 'utf-8').toString('base64')
  const res = await fetch(url, {
    method: 'PUT',
    headers: { ...headers(GITHUB_TOKEN), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      content: base64Content,
      sha: sha || undefined,
      branch: GITHUB_BRANCH,
    }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`GitHub PUT ${path} failed (${res.status}): ${body}`)
  }
  return res.json()
}

// Recent commits that touched one file, newest first. Without a path: the
// latest commits on the branch, whatever they changed.
export async function listCommits(path, limit = 15) {
  const { GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO, GITHUB_BRANCH } = env()
  const only = path ? `&path=${encodeURIComponent(path)}` : ''
  const url = `${API}/repos/${GITHUB_OWNER}/${GITHUB_REPO}/commits?sha=${encodeURIComponent(GITHUB_BRANCH)}${only}&per_page=${limit}`
  const res = await fetch(url, { headers: headers(GITHUB_TOKEN) })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`GitHub commits for ${path || 'the branch'} failed (${res.status}): ${body}`)
  }
  const list = await res.json()
  return list.map((c) => ({
    sha: c.sha,
    message: String(c.commit?.message || '').split('\n')[0],
    date: c.commit?.author?.date || c.commit?.committer?.date || null,
    author: c.commit?.author?.name || null,
    url: c.html_url,
  }))
}

// The file's content as it was at one commit (read only).
export async function getFileAt(path, ref) {
  const { GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO } = env()
  const url = `${API}/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}?ref=${encodeURIComponent(ref)}`
  const res = await fetch(url, { headers: headers(GITHUB_TOKEN) })
  if (res.status === 404) return null
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`GitHub GET ${path}@${ref} failed (${res.status}): ${body}`)
  }
  const data = await res.json()
  return Buffer.from(data.content, 'base64').toString('utf-8')
}

// ---- Listing and deleting many files at once (used by the Image library) --------
// The Contents API deletes one file per commit, and every commit makes Vercel rebuild
// the site. The Git Data API can remove many files in a single commit, so cleaning up
// twenty images costs one rebuild.

async function gh(path, { method = 'GET', body } = {}) {
  const { GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO } = env()
  const res = await fetch(`${API}/repos/${GITHUB_OWNER}/${GITHUB_REPO}${path}`, {
    method,
    headers: body ? { ...headers(GITHUB_TOKEN), 'Content-Type': 'application/json' } : headers(GITHUB_TOKEN),
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  })
  if (!res.ok) {
    const text = await res.text()
    const err = new Error(`GitHub ${method} ${path} failed (${res.status}): ${text.slice(0, 300)}`)
    err.status = res.status
    throw err
  }
  return res.json()
}

// Every file under the given folders, in one request: [{ path, size, sha }].
export async function listTree(prefixes) {
  const { GITHUB_BRANCH } = env()
  const ref = (await headSha()) || GITHUB_BRANCH
  const data = await gh(`/git/trees/${encodeURIComponent(ref)}?recursive=1`)
  if (data.truncated) throw new Error('The repository is too large to list in one go.')
  return (data.tree || [])
    .filter((e) => e.type === 'blob' && prefixes.some((p) => e.path.startsWith(p)))
    .map((e) => ({ path: e.path, size: e.size || 0, sha: e.sha }))
}

// A file's text by its blob sha (no branch lookup needed, and always exact).
export async function getBlobText(sha) {
  const data = await gh(`/git/blobs/${sha}`)
  return Buffer.from(data.content || '', 'base64').toString('utf-8')
}

// Removes every path in ONE commit. If someone else committed in the meantime nothing
// is changed and an error says so.
export async function deleteFiles(paths, message) {
  const { GITHUB_BRANCH } = env()
  const head = await headSha()
  if (!head) throw new Error('Could not read the branch from GitHub.')
  const commit = await gh(`/git/commits/${head}`)
  const tree = await gh('/git/trees', {
    method: 'POST',
    body: { base_tree: commit.tree.sha, tree: paths.map((path) => ({ path, mode: '100644', type: 'blob', sha: null })) },
  })
  const made = await gh('/git/commits', { method: 'POST', body: { message, tree: tree.sha, parents: [head] } })
  try {
    await gh(`/git/refs/heads/${encodeURIComponent(GITHUB_BRANCH)}`, { method: 'PATCH', body: { sha: made.sha, force: false } })
  } catch (err) {
    if (err.status === 422 || err.status === 409) throw new Error('The repo changed while deleting, so nothing was deleted. Try again.')
    throw err
  }
  return { commit: made.sha }
}
