// Source of truth is projects.json — this file is a thin re-export so existing
// imports across the app keep working unchanged. The admin panel
// (/admin) reads and writes projects.json directly via the GitHub API.
import data from './projects.json' with { type: 'json' }
export default data
