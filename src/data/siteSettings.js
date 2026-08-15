// Source of truth is siteSettings.json — this file is a thin re-export so existing
// imports across the app keep working unchanged. The admin panel
// (/admin) reads and writes siteSettings.json directly via the GitHub API.
import data from './siteSettings.json' with { type: 'json' }
export default data
