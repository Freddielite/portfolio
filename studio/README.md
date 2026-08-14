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
