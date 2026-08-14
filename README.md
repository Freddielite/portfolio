# Wilfred — Portfolio

React + Vite portfolio site with a blog, a no-code content dashboard
(Sanity Studio), testimonials, a working contact form, dark mode, analytics,
and SEO tags — deployed on Vercel.

## What's new in this version

- **Edit content without touching code** — projects, blog posts, skills,
  testimonials, and all the site copy (bio, links, contact info) live in a
  separate Studio dashboard once you connect it. See `studio/README.md` for
  the 10-minute setup. Until then, everything falls back to the plain files
  in `src/data/`, so the site works right out of the box either way.
- **Blog** at `/blog` — write posts in the Studio, or edit `src/data/posts.js`
  directly if you're not using the Studio yet.
- **Testimonials** section — edit `src/data/testimonials.js` or add them in
  the Studio.
- **Contact form that emails you** — create a free form at
  https://formspree.io, then paste the form ID into `formspreeId` in
  `src/data/siteSettings.js` (or the Studio). Until you do, the section just
  shows the existing email/GitHub buttons.
- **Dark mode** — toggle in the header, remembers the visitor's choice.
- **Site analytics** — Vercel Analytics is wired in already; it activates
  automatically once deployed on Vercel with Analytics turned on for the
  project (Project → Analytics tab).
- **SEO & social previews** — per-page titles/descriptions/Open Graph tags,
  an auto-generated `sitemap.xml` and `robots.txt`, and prerendered share
  tags for every blog post so links look right on Twitter/LinkedIn/WhatsApp.

## Before you deploy

1. Set `siteUrl` in `src/data/siteSettings.js` to your real domain — SEO tags
   and the sitemap are built from it.
2. If you want the Studio (recommended): follow `studio/README.md`, then set
   `VITE_SANITY_PROJECT_ID` in `.env` (copy from `.env.example`) and in
   Vercel's Environment Variables.
3. If you want the contact form to send email: set `formspreeId`.
4. Everything else in `src/data/` already has your real content from the
   previous version — tweak as needed.

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

Runs `vite build`, then a postbuild step that writes `sitemap.xml`,
`robots.txt`, and per-post SEO HTML into `dist/`.

## Deploy — Vercel

1. Push this folder to a GitHub repo.
2. Go to vercel.com → "Add New Project" → import the repo.
3. Framework preset: Vite. Build command `npm run build`, output dir `dist`
   (this is already configured via `vercel.json`, which also makes client
   routing for `/blog/*` work correctly).
4. Add `VITE_SANITY_PROJECT_ID` / `VITE_SANITY_DATASET` under Environment
   Variables if you've set up the Studio.
5. Deploy. Turn on Analytics for the project under the Vercel dashboard's
   Analytics tab (free tier is generous for a portfolio site).

## Project structure

```
src/
  components/     UI components (Hero, About, Projects, Contact, etc.)
  pages/          Routed pages: Home, BlogList, BlogPost
  data/           Fallback content — edit directly, or manage via Studio
  lib/            Sanity client + content-fetching layer (with fallback)
  context/        Site settings shared across components
studio/           Sanity Studio — the no-code content dashboard
scripts/          Build-time sitemap + SEO prerendering
```
