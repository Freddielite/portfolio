# Content Studio (no-code editing)

This is a private dashboard where you add/edit/remove projects, blog posts,
testimonials, skills, and site-wide text (bio, links, contact info) — no
code, no git commits, just a web form. It's a separate deployment from the
portfolio site itself, and only you can access it.

**If something breaks during setup, check `HANDOVER.md` in this same folder
first** — it covers every real issue we hit getting this running the first
time, with the actual fix for each.

## One-time setup

1. **Create a free Sanity account**: go to https://www.sanity.io/get-started
   and sign up (GitHub or Google login is fastest).

2. **Install the CLI and connect this folder to a new project:**
   ```bash
   cd studio
   npm install
   npx sanity init
   ```
   When prompted:
   - "Create new project" → yes, give it any name (e.g. "wilfred-portfolio")
   - "Use the default dataset configuration?" → yes (this creates `production`)
   - It will ask to write config — since `sanity.config.js` already exists,
     choose to keep it, then open the file and replace `YOUR_PROJECT_ID`
     with the project ID it printed in the terminal.

   ⚠️ **Every time you copy a fresh zip of this project over your files,
   this line resets back to the placeholder** — it's easy to forget to
   redo it, and it causes the Studio to crash with a generic error. If the
   Studio ever suddenly stops working after updating files, check this line
   first.

3. **Run the Studio locally to add your content:**
   ```bash
   npm run dev
   ```
   Opens at http://localhost:3333 — log in, click "Site settings" and fill
   in your real bio/links/contact info, then add Projects, Skills,
   Testimonials, and Blog posts.

4. **Deploy the Studio so you can edit content from anywhere** (not just
   your laptop). We host it on Vercel, the same way as the main site,
   rather than using Sanity's own `*.sanity.studio` hosting — Sanity's
   hosted version currently has a bug (on their end, not this project)
   where it redirects into a broken "Dashboard" wrapper for some accounts.
   Self-hosting on Vercel avoids that entirely.

   ```bash
   npm run build
   ```
   This produces a plain static site in `studio/dist`.

   Then, on vercel.com:
   - **Add New Project** → import the same GitHub repo again (this becomes
     a second, separate Vercel project from your main site)
   - Root Directory: `studio`
   - Framework preset: **Other**
   - Build command: `npm run build`, Output directory: `dist`
   - Under Environment Variables, remove anything Vercel auto-detected —
     the Studio doesn't need any env vars, the project ID lives directly
     in `sanity.config.js`
   - Deploy

   This gives you a second URL (e.g. `your-project-studio.vercel.app`).
   Bookmark it, that's your permanent admin panel.

5. **Allow both URLs to talk to Sanity's API (CORS).** This step is easy to
   miss and causes the Studio *and* the live site to silently fail (no
   error shown, they just quietly fall back to old/default content).
   - Go to https://sanity.io/manage → your project → **API** → **CORS origins**
   - **Add CORS origin** → enter your Studio's Vercel URL (e.g.
     `https://your-project-studio.vercel.app`) → turn on **Allow credentials**
   - **Add CORS origin** again → enter your **main site's** URL (e.g.
     `https://your-site.vercel.app`) → **Allow credentials** on here too
   - Both need to be added. Only adding the Studio's URL is a common miss —
     the main site fetches content from Sanity directly in the browser too,
     and needs its own entry on this list.

6. **Connect the main site to this content.** In the project root (not this
   `studio` folder), copy `.env.example` to `.env` and set:
   ```
   VITE_SANITY_PROJECT_ID=<the project ID from step 2>
   VITE_SANITY_DATASET=production
   ```
   Add the same two variables in your **main site's** Vercel project
   (Settings → Environment Variables), then **redeploy** — adding env vars
   alone doesn't rebuild the site; Vite only reads them at build time, so
   an explicit redeploy is required after saving them.

## Day to day

Once connected, adding a project, publishing a blog post, or updating your
bio is just: open the Studio URL → edit → click **Publish**. Changes show up
on the live site within a minute or two (no rebuild needed for content that's
fetched at page load; blog post SEO tags refresh on the next deploy).

## Notes

- Until you complete this setup, the site works fine using the placeholder
  content in `src/data/` — nothing is broken by skipping this.
- The "Site settings" item is a singleton — there's only ever one, edit it
  in place rather than creating a new one.
- **"Show testimonials section"** lives under Site settings — toggle it off
  to hide that section from the live site without deleting any testimonials.

## Importing your existing content

By default the Studio starts empty, which makes editing awkward — there's
nothing to click into. This script copies everything already in
`src/data/` (projects, skills, testimonials, blog posts, and your
bio/contact info) straight into Sanity as real, editable documents.

1. **Create a write-access API token:**
   - Go to https://www.sanity.io/manage, click into your project
   - Go to **API** → **Tokens** → **Add API token**
   - Name it anything (e.g. "seed script"), set permissions to **Editor**
   - Copy the token immediately — Sanity only shows it once

2. **Add it to your `.env` file** in the project root (not the `studio`
   folder):
   ```
   VITE_SANITY_PROJECT_ID=<your project ID>
   VITE_SANITY_DATASET=production
   SANITY_API_TOKEN=<paste the token from step 1>
   ```

3. **From the project root** (not `studio`), run:
   ```bash
   npm install
   npm run seed
   ```

4. **Open your Studio** — refresh it — and everything should be there.

From here, editing or deleting anything is just: open the item in the
Studio, change it or hit the trash icon, click Publish.

**Safe to run again:** each document gets a stable ID based on its
name/slug (not its position in the list), so adding, removing, or
reordering entries in `src/data/` and re-running `npm run seed` does the
right thing:
- Edited entries update in place.
- New entries get added.
- Anything you removed from `src/data/` gets deleted from Sanity too
  (the script prints what it's removing before it does).

**"Site settings" is protected from re-runs.** It only gets created the
first time (if it doesn't exist yet in Sanity). After that, re-running
`npm run seed` never touches it again — so toggles like "Show testimonials
section," or any bio/contact info you've since edited in the Studio, are
safe no matter how many times you re-run the script. If you ever
genuinely want to reset Site settings back to what's in
`src/data/siteSettings.js`, delete the "Site settings" document in the
Studio first, then re-run `npm run seed` to recreate it.

For everything else (projects, skills, testimonials, posts), the file is
treated as the source of truth on re-run — so re-running the script will
overwrite any edits you've since made *in the Studio* to an item that also
exists in `src/data/`. If you're managing something entirely from the
Studio now, just leave it out of `src/data/` and it won't be touched.
