// Source of truth is skills.json — this file is a thin re-export so existing
// imports across the app keep working unchanged. The admin panel
// (/admin) reads and writes skills.json directly via the GitHub API.
import data from './skills.json' with { type: 'json' }
export default data
