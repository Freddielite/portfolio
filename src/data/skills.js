// Source of truth is content/skills.json (edited by the admin at /admin through the
// GitHub API). This file re-exports it so imports across the app stay the same.
import data from '../../content/skills.json' with { type: 'json' }
export default data.filter((s) => !s.hidden)
