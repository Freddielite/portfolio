// Source of truth is content/posts.json (edited by the admin at /admin through the
// GitHub API). This file re-exports it so imports across the app stay the same.
import data from '../../content/posts.json' with { type: 'json' }
import { isLivePost } from '../lib/postStatus.js'

// Drafts live in content/drafts.json and are never imported here. Posts dated in
// the future stay hidden until their date.
export default data.filter((p) => isLivePost(p))
