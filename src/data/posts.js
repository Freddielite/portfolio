// Source of truth is posts.json — this file is a thin re-export so existing
// imports across the app keep working unchanged. The admin panel
// (/admin) reads and writes posts.json directly via the GitHub API.
import data from './posts.json' with { type: 'json' }
export default data
