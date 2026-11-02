// Source of truth is content/testimonials.json (edited by the admin at /admin through the
// GitHub API). This file re-exports it so imports across the app stay the same.
import data from '../../content/testimonials.json' with { type: 'json' }
export default data.filter((t) => !t.hidden)
