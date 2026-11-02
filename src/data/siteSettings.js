// Source of truth is content/siteSettings.json (edited by the admin at /admin through the
// GitHub API). This file re-exports it so imports across the app stay the same.
import data from '../../content/siteSettings.json' with { type: 'json' }
export default data
