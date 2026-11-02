// Source of truth is content/projects.json (edited by the admin at /admin through the
// GitHub API). This file re-exports it so imports across the app stay the same.
import data from '../../content/projects.json' with { type: 'json' }

// Items switched off in the admin ("Show on site" unticked) never reach the site.
export default data.filter((p) => !p.hidden)
