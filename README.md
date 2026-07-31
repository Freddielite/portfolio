# Wilfred — Portfolio

React + Vite portfolio site. Static output, no backend required — deploys free on
Vercel, Netlify, or GitHub Pages.

## Before you deploy

Edit these two files with your real info:

- `src/data/projects.js` — project descriptions marked `// TODO (Wilfred)` for
  Wyntek, Expenses Tracker, and Eaksline Courier. Add `live` / `github` links
  for Shefitts.co and WardrobeSwap if you want buttons for those too.
- `src/components/Contact.jsx` — replace the placeholder `mailto:hello@wyntek.example`
  with your real email.

## Local development

```bash
npm install
npm run dev
```

Opens at `http://localhost:5173`.

## Build

```bash
npm run build
```

Outputs static files to `dist/`.

## Deploy — pick one

### Vercel (free)
1. Push this folder to a GitHub repo.
2. Go to vercel.com → "Add New Project" → import the repo.
3. Framework preset: Vite. Build command `npm run build`, output dir `dist`.
4. Deploy. Vercel gives you a free `*.vercel.app` URL and redeploys on every push.

### Netlify (free)
1. Push this folder to a GitHub repo.
2. Go to app.netlify.com → "Add new site" → "Import an existing project".
3. Build command: `npm run build`. Publish directory: `dist`.
4. Deploy. Free `*.netlify.app` URL, redeploys on every push.

### GitHub Pages (free, no separate host)
1. Push this folder to a GitHub repo.
2. `npm install -D gh-pages`, then add to `package.json` scripts:
   `"deploy": "npm run build && npx gh-pages -d dist"`
3. Run `npm run deploy`.
4. In the repo settings → Pages, set the source to the `gh-pages` branch.
5. Site publishes at `https://<username>.github.io/<repo-name>/`.

`vite.config.js` already uses a relative `base: './'`, so the build works
correctly whether it's served from a root domain (Vercel/Netlify) or a
subpath (GitHub Pages project site).
