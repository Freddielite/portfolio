# Studio handover notes

This is a troubleshooting reference, not a setup guide (see `README.md` for
that). Everything here actually happened while getting the Studio running
the first time — if something looks familiar, the fix is below.

---

### "An error occurred that Sanity Studio was unable to recover from"

**Most common cause:** `studio/sanity.config.js` still has the placeholder
project ID instead of the real one.

Open the file, check this line near the top:
```js
projectId: 'YOUR_PROJECT_ID',
```
If it says that instead of your real ID (e.g. `3b34374l`), swap it, commit,
push, and let Vercel redeploy the Studio.

**This resets every time you copy a fresh zip over your files** — it's the
single easiest thing to forget after an update.

---

### Studio crashes specifically at a `sanity.io/@yourorg/studio/...` URL

This is a real bug on Sanity's own platform (not this project): their
newer "Dashboard" feature redirects `*.sanity.studio` URLs into a wrapper
that crashes with "Studio is not fully compatible with Dashboard / Content
Agent is not supported." Other developers have hit the identical issue.

**Fix:** don't use Sanity's own hosting at all. This project self-hosts the
Studio on Vercel instead (see `README.md` step 4), which completely avoids
the redirect since it never touches Sanity's hosting domain.

---

### `npm install` / `npm run dev` / `npm run build` fails with "Could not resolve react-is" or a missing `styled-components`

Sanity's tooling has a couple of peer dependencies it sometimes expects to
auto-install on the fly, and that auto-install step can fail (especially on
Windows/permission-restricted environments). Both are already pinned
directly in `studio/package.json` as of this handover, so a plain
`npm install` should bring them in without any extra step. If a similar
"Could not resolve X" error shows up for some other package in the future,
the fix is the same pattern: add it to `studio/package.json` under
`dependencies` and reinstall.

---

### You edited something in the Studio, hit Publish, but the live site doesn't change

Work through these in order:

1. **Is the main site actually connected to Sanity at all?** Check your
   main site's Vercel project → Settings → Environment Variables. Both
   `VITE_SANITY_PROJECT_ID` and `VITE_SANITY_DATASET` need to be there. If
   they're missing, the site silently runs on the fallback content in
   `src/data/` forever, no error shown.

2. **Did you redeploy after adding those variables?** Saving an
   environment variable does not rebuild the site. Vite only reads env
   vars at build time, so you need to manually trigger Deployments →
   latest → **Redeploy** after adding or changing them.

3. **Is your main site's URL allowed in Sanity's CORS origins?** Go to
   sanity.io/manage → your project → API → CORS origins. Both your
   Studio's URL *and* your main site's URL need entries here, with "Allow
   credentials" on. Only adding the Studio's URL is the most common miss —
   the main site fetches from Sanity directly in the visitor's browser, so
   it needs its own entry too. Without it, requests are silently blocked
   and the site falls back to old content with no visible error.

4. **Hard refresh** (Ctrl+Shift+R / Cmd+Shift+R) before concluding
   something's still broken — browsers cache aggressively, and a normal
   refresh can show a stale version even after everything above is fixed.

---

### Which Vercel project is which

You end up with **two separate Vercel projects** from the same GitHub repo,
easy to mix up:

- **Main site** (root directory: repo root) — this is the actual portfolio
  people visit. Needs `VITE_SANITY_PROJECT_ID` / `VITE_SANITY_DATASET` env
  vars.
- **Studio** (root directory: `studio`) — this is the admin dashboard.
  Needs no environment variables at all; its project ID lives in
  `sanity.config.js`.

If you're troubleshooting env vars or CORS and nothing's working, double
check you're looking at the right one of these two projects.
