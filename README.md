# Wilfred — Portfolio

React + Vite portfolio site with a blog, a custom built-in admin panel,
testimonials, a working contact form, dark mode, analytics, and SEO tags —
deployed on Vercel.

## What's new in this version

- **A real admin panel at `/admin`** — one password, no separate dashboard,
  no third-party CMS. Edit projects, blog posts, skills, testimonials, and
  all the site copy (bio, links, contact info) from a form in your browser.
  Hitting Save commits the change straight to your GitHub repo, which
  triggers Vercel's normal auto-deploy — the same thing that happens when you
  push code yourself. See **"Setting up the admin panel"** below.
- **Blog** at `/blog` — write posts from `/admin`, or edit
  `src/data/posts.json` directly.
- **Testimonials** section — edit from `/admin`, or `src/data/testimonials.json`.
- **Contact form that emails you** — create a free form at
  https://formspree.io, then paste the form ID into the "Formspree form ID"
  field in `/admin`'s Site Settings tab (or `formspreeId` in
  `src/data/siteSettings.json`). Until you do, the section just shows the
  existing email/GitHub buttons.
- **Dark mode** — toggle in the header, remembers the visitor's choice.
- **Site analytics** — Vercel Analytics is wired in already; it activates
  automatically once deployed on Vercel with Analytics turned on for the
  project (Project → Analytics tab).
- **SEO & social previews** — per-page titles/descriptions/Open Graph tags,
  an auto-generated `sitemap.xml` and `robots.txt`, and prerendered share
  tags for every blog post so links look right on Twitter/LinkedIn/WhatsApp.

## Setting up the admin panel

The admin panel needs five environment variables, all set in **Vercel →
your project → Settings → Environment Variables** (never in a committed
`.env` file — see `.env.example` for the same list with comments).

1. **`ADMIN_PASSWORD`** — whatever password you want to type in at `/admin`.
   There's no username. Pick something you don't reuse anywhere else.

2. **`SESSION_SECRET`** — a random string used to sign your login session.
   Generate one with:
   ```bash
   openssl rand -hex 32
   ```

3. **`GITHUB_TOKEN`** — a GitHub token the admin panel uses to commit your
   edits. Create one at **github.com → Settings → Developer settings →
   Personal access tokens → Fine-grained tokens → Generate new token**:
   - Repository access: **Only select repositories** → pick this repo.
   - Permissions → Repository permissions → **Contents: Read and write**.
     Nothing else needs any access.
   - Copy the token now; GitHub only shows it once.

4. **`GITHUB_OWNER`** — your GitHub username or org (the part before the
   repo name in the URL).

5. **`GITHUB_REPO`** — this repo's name.

   (Optional: **`GITHUB_BRANCH`**, defaults to `main` if you don't set it.)

After adding all five, go to **Deployments → latest → Redeploy** (adding env
vars doesn't rebuild automatically). Then visit `yoursite.com/admin` and log
in with `ADMIN_PASSWORD`.

**Note on redeploy time:** every save is a real git commit, so a change
takes roughly the same ~30–60 seconds to go live as pushing code yourself —
the admin panel tells you this after you save. That's a deliberate trade-off
for reliability: there's no separate dataset or CDN cache that can drift out
of sync with what you see on the live site.

## Before you deploy

1. Set `siteUrl` in Site Settings (or `src/data/siteSettings.json`) to your
   real domain — SEO tags and the sitemap are built from it.
2. Set up the admin panel env vars above (or skip it — the site works fine
   on the existing content in `src/data/` either way).
3. If you want the contact form to send email: set the Formspree form ID.

## Local development

```bash
npm install
npm run dev
```

Opens at `http://localhost:5173`. The `/admin` panel itself needs the
serverless functions in `api/`, which only run on Vercel (via `vercel dev`
if you have the Vercel CLI installed) — plain `vite dev` serves the public
site only.

## Build

```bash
npm run build
```

Runs `vite build`, then a postbuild step that writes `sitemap.xml`,
`robots.txt`, and per-post SEO HTML into `dist/`.

## Deploy — Vercel

1. Push this folder to a GitHub repo.
2. Go to vercel.com → "Add New Project" → import the repo.
3. Framework preset: Vite. Build command `npm run build`, output dir `dist`
   (already configured via `vercel.json`, which also makes client routing
   for `/blog/*` and `/admin` work correctly). The `api/` folder is picked up
   automatically as serverless functions — no extra config needed.
4. Add the five admin panel env vars from above, if you want the admin panel.
5. Deploy. Turn on Analytics for the project under the Vercel dashboard's
   Analytics tab (free tier is generous for a portfolio site).

There's now just **one** Vercel project for the whole thing — no separate
Studio deployment to keep track of.

## Project structure

```
src/
  components/     UI components (Hero, About, Projects, Contact, etc.)
  pages/          Routed pages: Home, BlogList, BlogPost, Admin
  admin/          Admin panel UI — login, dashboard, per-section editors
  data/           Your actual content, as JSON — edit directly or via /admin
  lib/            Content-loading layer (reads src/data/*.json)
  context/        Site settings shared across components
api/
  admin/          Serverless functions: login, session check, content
                  read/write, image upload — all backed by the GitHub API
  _lib/           Shared auth/cookie/GitHub-API helpers
scripts/          Build-time sitemap + SEO prerendering
```
