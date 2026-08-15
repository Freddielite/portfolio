// Source of truth is testimonials.json — this file is a thin re-export so existing
// imports across the app keep working unchanged. The admin panel
// (/admin) reads and writes testimonials.json directly via the GitHub API.
import data from './testimonials.json' with { type: 'json' }
export default data
