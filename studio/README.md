# Content Studio (no-code editing)

This is a private dashboard where you add/edit/remove projects, blog posts,
testimonials, skills, and site-wide text (bio, links, contact info) — no
code, no git commits, just a web form. It's separate from the portfolio site
itself and only you can access it.

## One-time setup (~10 minutes)

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

3. **Run the Studio locally to add your content:**
   ```bash
   npm run dev
   ```
   Opens at http://localhost:3333 — log in, click "Site settings" and fill
   in your real bio/links/contact info, then add Projects, Skills,
   Testimonials, and Blog posts.

4. **Deploy the Studio so you can edit content from anywhere** (not just
   your laptop):
   ```bash
   npm run deploy
   ```
   This gives you a URL like `https://wilfred-portfolio.sanity.studio` —
   bookmark it. That's your permanent "admin panel."

5. **Connect the main site to this content.** In the project root (not this
   `studio` folder), copy `.env.example` to `.env` and set:
   ```
   VITE_SANITY_PROJECT_ID=<the project ID from step 2>
   VITE_SANITY_DATASET=production
   ```
   Add the same two variables in your Vercel project's Environment Variables
   settings, then redeploy. The site will now pull everything from the
   Studio instead of the fallback files in `src/data/`.

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

## Importing your existing content (do this once, right after setup)

By default the Studio starts empty, which makes editing awkward — there's
nothing to click into. This script copies everything already on your live
site (your 4 projects, 7 skills, 3 testimonials, 2 blog posts, and your
bio/contact info) straight into Sanity as real, editable documents.

1. **Create a write-access API token:**
   - Go to https://www.sanity.io/manage, click into your project
     (`wilfred-portfolio`)
   - Go to **API** → **Tokens** → **Add API token**
   - Name it anything (e.g. "seed script"), set permissions to **Editor**
   - Copy the token immediately — Sanity only shows it once

2. **Add it to your `.env` file** in the project root (not the `studio`
   folder). If you don't have one yet, copy `.env.example` to `.env` first:
   ```
   VITE_SANITY_PROJECT_ID=3b34374l
   VITE_SANITY_DATASET=production
   SANITY_API_TOKEN=<paste the token from step 1>
   ```

3. **From the project root** (not `studio`), run:
   ```bash
   npm install
   npm run seed
   ```
   You should see it list out 17 documents and confirm they were created.

4. **Open your Studio** — refresh it — and everything should be there:
   4 projects, 7 skills, 3 testimonials, 2 blog posts, and your Site
   settings filled in with your real bio and links.

From here, editing or deleting anything is just: open the item in the
Studio, change it or hit the trash icon, click Publish.

**Safe to run again:** the script uses fixed IDs, so re-running `npm run
seed` later updates the same documents instead of creating duplicates — but
it will overwrite any edits you've since made in the Studio to that specific
item, so only re-run it if that's what you want.
