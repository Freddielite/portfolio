# Wilfred, Portfolio

React + Vite portfolio with a blog, a built-in admin panel, testimonials, dark mode, analytics and SEO, deployed on Vercel.

## Redesign (Oct 2026)

- **One scrolling page.** Hero, About, Skills, Work, Services and Process, blog teaser, testimonials and a contact brief builder. The blog is the only separate page (`/blog`, `/blog/:slug`).
- **Page transition.** A curtain with the page name plays when you enter or leave the blog. Same-page links just scroll.
- **First-visit intro.** Photo ring, name and counter, then the screen splits open. Plays on every full page load or refresh of the home page. Click to skip. To limit it to once per visit, store a flag in `sessionStorage` in `App.jsx`.
- **Command palette.** Ctrl/Cmd + K jumps to any section, project or post. The header search button opens it too.
- **Case studies** open as a popup over the page, with previous and next project, arrow keys and Esc.
- **Projects have a type.** Set "Type" in `/admin` (Own product, Client work, Company). It drives the badge on each card and the Work filter.
- **Card to popup morph.** The project cover grows out of its card into the case study and shrinks back on close (View Transitions API, falls back to a plain open on unsupported browsers).
- **Hero scroll handoff.** The headline and photo stage drift and shrink as you scroll out of the hero.
- **Live status chips.** Set `pulseApiUrl` and `pulseStatusToken` in `/admin` (Site settings, Live status). Projects whose live URL matches a monitor on that Pulse public status page show Online, Slow or Down with response time. Pulse must list this site in its `CORS_ORIGIN` env var, or the browser will block the request and no chip shows.
- **Client work:** Kall Konnect (the app) and Kall Konnect Website (its download site) are client projects. Source repos are private, so they have no GitHub link.
- **Project covers** for Kall Konnect, Wynmail, Pulse and FocusDial are generated placeholders in `public/images/projects/`. Replace them with real screenshots from `/admin` (Projects, Screenshot).
- **Contact brief builder.** Visitors pick what they need, timeline and engagement, and the message builds live. Send by email, WhatsApp, copy, or straight to Formspree when `formspreeId` is set.
- **Hero roles.** The typed "Currently building" line can be overridden with a `heroRoles` array in `src/data/siteSettings.json`.
- **Responsive.** Tested from 360px to 1440px with no horizontal scroll. Navigation collapses to a menu below 1100px. Animations respect reduced motion, and the custom cursor only runs on mouse devices.

## What's new in this version

- **A real admin panel at `/admin`**, one password, no separate dashboard,
  no third-party CMS. Edit projects, blog posts, skills, testimonials, and
  all the site copy (bio, links, contact info) from a form in your browser.
  Hitting Save commits the change straight to your GitHub repo, which
  triggers Vercel's normal auto-deploy, the same thing that happens when you
  push code yourself. See **"Setting up the admin panel"** below.
- **Blog** at `/blog`, write posts from `/admin`, or edit
  `src/data/posts.json` directly.
- **Testimonials** section, edit from `/admin`, or `src/data/testimonials.json`.
- **Contact form that emails you**, create a free form at
  https://formspree.io, then paste the form ID into the "Formspree form ID"
  field in `/admin`'s Site Settings tab (or `formspreeId` in
  `src/data/siteSettings.json`). Until you do, the section just shows the
  existing email/GitHub buttons.
- **Dark mode**, toggle in the header, remembers the visitor's choice.
- **Site analytics**, Vercel Analytics is wired in already; it activates
  automatically once deployed on Vercel with Analytics turned on for the
  project (Project → Analytics tab).
- **SEO & social previews**, per-page titles/descriptions/Open Graph tags,
  an auto-generated `sitemap.xml` and `robots.txt`, and prerendered share
  tags for every blog post so links look right on Twitter/LinkedIn/WhatsApp.

## Setting up the admin panel

The admin panel needs five environment variables, all set in **Vercel →
your project → Settings → Environment Variables** (never in a committed
`.env` file, see `.env.example` for the same list with comments).

1. **`ADMIN_PASSWORD`**, whatever password you want to type in at `/admin`.
   There's no username. Pick something you don't reuse anywhere else.

2. **`SESSION_SECRET`**, a random string used to sign your login session.
   Generate one with:
   ```bash
   openssl rand -hex 32
   ```

3. **`GITHUB_TOKEN`**, a GitHub token the admin panel uses to commit your
   edits. Create one at **github.com → Settings → Developer settings →
   Personal access tokens → Fine-grained tokens → Generate new token**:
   - Repository access: **Only select repositories** → pick this repo.
   - Permissions → Repository permissions → **Contents: Read and write**.
     Nothing else needs any access.
   - Copy the token now; GitHub only shows it once.

4. **`GITHUB_OWNER`**, your GitHub username or org (the part before the
   repo name in the URL).

5. **`GITHUB_REPO`**, this repo's name.

   (Optional: **`GITHUB_BRANCH`**, defaults to `main` if you don't set it.)

After adding all five, go to **Deployments → latest → Redeploy** (adding env
vars doesn't rebuild automatically). Then visit `yoursite.com/admin` and log
in with `ADMIN_PASSWORD`.

**Note on redeploy time:** every save is a real git commit, so a change
takes roughly the same ~30–60 seconds to go live as pushing code yourself -
the admin panel tells you this after you save. That's a deliberate trade-off
for reliability: there's no separate dataset or CDN cache that can drift out
of sync with what you see on the live site.

## Before you deploy

1. Set `siteUrl` in Site Settings (or `src/data/siteSettings.json`) to your
   real domain, SEO tags and the sitemap are built from it.
2. Set up the admin panel env vars above (or skip it, the site works fine
   on the existing content in `src/data/` either way).
3. If you want the contact form to send email: set the Formspree form ID.

## Local development

```bash
npm install
npm run dev
```

Opens at `http://localhost:5173`. The `/admin` panel itself needs the
serverless functions in `api/`, which only run on Vercel (via `vercel dev`
if you have the Vercel CLI installed), plain `vite dev` serves the public
site only.

## Build

```bash
npm run build
```

Runs `vite build`, then a postbuild step that writes `sitemap.xml`,
`robots.txt`, and per-post SEO HTML into `dist/`.

## Deploy, Vercel

1. Push this folder to a GitHub repo.
2. Go to vercel.com → "Add New Project" → import the repo.
3. Framework preset: Vite. Build command `npm run build`, output dir `dist`
   (already configured via `vercel.json`, which also makes client routing
   for `/blog/*` and `/admin` work correctly). The `api/` folder is picked up
   automatically as serverless functions, no extra config needed.
4. Add the five admin panel env vars from above, if you want the admin panel.
5. Deploy. Turn on Analytics for the project under the Vercel dashboard's
   Analytics tab (free tier is generous for a portfolio site).

There's now just **one** Vercel project for the whole thing, no separate
Studio deployment to keep track of.

## Project structure

```
src/
  components/     UI components (Hero, About, Projects, Contact, etc.)
  pages/          Routed pages: Home, BlogList, BlogPost, Admin
  admin/          Admin panel UI, login, dashboard, per-section editors
  data/           Your actual content, as JSON, edit directly or via /admin
  lib/            Content-loading layer (reads src/data/*.json)
  context/        Site settings shared across components
api/
  admin/          Serverless functions: login, session check, content
                  read/write, image upload, all backed by the GitHub API
  _lib/           Shared auth/cookie/GitHub-API helpers
scripts/          Build-time sitemap + SEO prerendering
```
