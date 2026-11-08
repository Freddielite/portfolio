# Wilfred, Portfolio

React + Vite portfolio with a blog, a built-in admin panel, testimonials, dark mode, analytics and SEO, deployed on Vercel.

## Updating safely (keeps your /admin edits)

The admin saves edits straight to GitHub (`content/*.json`, `public/cv.pdf`, `public/images/*`). If you unzip a new `portfolio.zip` over your folder, those files are replaced with older copies and your edits are lost. Use the update script instead:

```
./scripts/safe-update.sh ~/Downloads/portfolio.zip
git add . && git commit -m "your message" && git push
```

It pulls your latest edits first, copies only the code from the zip, and only adds content files that do not exist yet. If an update needs a content change (for example a new setting), the notes will tell you to make it in `/admin`.

## Android app (Nov 2026)

An Android app (Capacitor) that opens your live `/admin` and adds a real fingerprint lock, like WhatsApp's.

- **Build the APK:** `bash scripts/build-apk.sh`. It finds Android Studio's Java 21 and SDK, syncs the project, builds, and saves `~/Downloads/portfolio-admin.apk`. The first run downloads Gradle and takes a few minutes. Or open the `android/` folder in Android Studio and use Build, Build APK.
- **Install:** copy the APK to your phone and open it, or `adb install -r ~/Downloads/portfolio-admin.apk`. It is signed with your local debug key, so build every update on the same computer, otherwise Android asks you to uninstall first.
- **Updates:** the app loads the live site, so every admin change you deploy shows up with no new APK. Rebuild only when something under `android/`, `native/` or `capacitor.config.json` changes.
- **Fingerprint lock:** in the app, Overview, Security, "Turn on fingerprint unlock". A random secret is stored in the phone's Keystore, released only by a live fingerprint (the key is lost if a fingerprint is added to the phone, then use your password and turn it on again). The server keeps only a hash of it (`security/passkeys.json`, `kind: native`). The browser and installed web app keep using passkeys as before.
- **In the app settings:** lock right away / after 1, 5 or 10 minutes, and hide the app in recent apps and block screenshots (on by default).
- **Backups and CSV:** Android cannot download files from a page, so the app opens the share sheet (Save to Drive, Files, WhatsApp).
- **View live site / View on site:** in the app these open in the phone's in-app browser (a Chrome tab with an X at the top) instead of replacing the admin full screen. `MainActivity.java` catches any page of the site outside `/admin` and opens it that way, so it works even before the website update is deployed. Rebuild the APK once after this update.
- Only Android. The address the app opens is in `capacitor.config.json` (`server.url`).

## Newsletter with Wynmail (Nov 2026)

- **Signup box** in the footer and under every post. It posts straight to a Wynmail signup form, so the key stays out of the browser. In `/admin` > Site settings > Newsletter set the Wynmail API URL and the form slug. Leave them empty to hide the box.
- **Subscribers tab** in `/admin`: subscribed, joined this week and month, unsubscribed and bounced counts, the 10 newest signups, CSV export, and an **Email a post** list. Sending creates a Wynmail campaign named `post:<slug>`, which is also how the tab knows a post was already sent.
- **Vercel env vars** (then redeploy once): `WYNMAIL_API_URL`, `WYNMAIL_API_KEY` (a workspace key from Wynmail's API page), `WYNMAIL_LIST_ID` (the subscribers list number).
- **In Wynmail**: make a signup form for that list (Forms page), approve a sending domain in Settings (the confirmation email and the post emails need one), and set a footer postal address.
- Sending needs a live post, so wait for the deploy to finish after publishing.

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
- **Premium polish.** Self-drawing check marks and a toast when you copy the brief or a blog link (and when a brief is sent). Press feedback on buttons and chips. Cards get a spinning gradient border on hover with a mouse and a faint static one in dark mode, plus a subtle grain. The page background tints slightly as you move through About, Work, Services and Contact. On phones the case study is a sheet: swipe left or right to switch project, drag down from the top to close. Project and blog images fade in from a tiny blurred placeholder (`src/lib/lqip.json`; images uploaded later in `/admin` fade in from a soft shimmer instead).
- **Share previews.** `public/images/og-card.jpg` (1200x630) is the default link preview image for WhatsApp, LinkedIn and X. The build writes absolute image and canonical URLs into the home page and every blog post (from Site URL in `/admin`), because those apps do not run JavaScript. Posts with a cover image use it instead. WhatsApp caches previews, so test a changed link by adding `?v=2` to the URL.
- **404 page.** Unknown URLs show a designed "page not found" with links home, to Work and the blog, plus the latest posts. It is marked noindex so Google does not list it. (Vercel serves unknown URLs with the app shell, so the status code stays 200 and the noindex tag is what keeps them out of search.)
- **Blog topics and related posts.** Each post has tags, set in `/admin` (Tags field) or chosen automatically from the title and excerpt when left empty (rules in `src/lib/tags.js`). The blog page has topic filter chips (also reachable as `/blog?tag=Email`), and every post ends with "Keep reading", the three most related posts.
- **Share image per post.** At build time each post gets its own 1200x630 title card at `/og/<slug>.png` (made with satori and resvg, fonts from `@fontsource`). Posts share on WhatsApp, LinkedIn and X with their own title. If image generation ever fails, the build continues and the post falls back to its cover image or the site-wide card.
- **Web CV at `/cv`.** Built from the same data as the site (about text, skills, projects, latest posts, availability), so it never goes stale. On screen it is a clean page, and "Print or save as PDF" (or Ctrl+P) turns it into a tidy two-page A4 CV with the site chrome hidden. It sits next to your uploaded PDF CV, which keeps working at `/cv.pdf`. There are no employment or education sections yet because that data does not exist in the admin.
- **Structured data (JSON-LD).** The build writes Person and WebSite data into the home page, and BlogPosting plus breadcrumb data into every post, so search engines understand who you are and what each post is. Check it after a deploy with Google's Rich Results Test.
- **Content lives in `content/`, not in the code.** Everything you edit in `/admin` (settings, projects, skills, testimonials, posts, drafts) is saved to `content/*.json`. Code updates never include that folder, so a zip update cannot overwrite your edits. `scripts/safe-update.sh` also moves the old `src/data/*.json` files into `content/` the first time it runs.
- **Admin overview.** The first admin tab shows a setup checklist (site URL, LinkedIn, Formspree, Pulse, meta description, testimonial names, screenshots, alt text, post summaries), post and project counts, a live health table from Pulse, and backup and restore.
- **Change history and undo.** Every editor has a History button listing recent saves (each save is a git commit). "Load this version" puts an older version in the editor as an unsaved change, so you review it before saving.
- **Safer saving.** Content is checked before it saves (required names, valid web addresses, unique slugs, valid dates). If the content changed somewhere else since you opened it, you get a clear message and a reload button instead of an overwrite. After a save the admin shows saving, rebuilding, live: the build writes its commit to `/build.json` and the admin waits for it.
- **Admin layout and buttons (Nov 2026).** Anything that is really a link (View on site, Open settings) uses `.admin-link`, which looks and sizes like a button; the checklist "Fix" and the mobile "All posts" are matching small buttons. On a post, Delete and View on site sit together in `.builder-actions` (right-aligned on desktop, two equal buttons on phones). On wide screens the editor uses the full width and the Overview shows its cards in two columns; other tabs use a wider column.
- **Block editor (Nov 2026).** The blog builder is now made of blocks (text, image, code and columns) instead of one text box. Drag the handle on a block, or use its arrows, to reorder. A Columns block holds two groups of blocks side by side (equal halves, or one narrow and one wide) and stacks to one column on phones. Drag blocks into and out of the columns, drop photos onto the editor to add several at once, and Undo reverses the last block change. Posts are still stored as the same block list in `content/posts.json`, with a new `columns` block (`left` and `right` lists), so older posts open as they were. Code: `src/admin/builder/BlockEditor.jsx` and `blockModel.js`, and `src/lib/blocks.js` for anything that reads a post body. Web-only change, no APK rebuild needed.
- **Blog builder.** Write posts with a formatting toolbar (bold, italic, links, headings, lists, quotes, code blocks, images, plus Ctrl+B/I/K and pasting images), a live preview that uses the real blog styles, and an SEO tab with a checklist, a Google snippet preview and a share-card preview. Posts can be Draft, Published or Scheduled. Drafts are stored in `content/drafts.json`, which the public site never imports, so draft text is not shipped. A published post dated in the future stays hidden until that date.
- **Image tools.** Uploads are resized, converted to WebP, and a tiny blur placeholder is stored with the image so it fades in smoothly. Projects and post covers have an alt text field.
- **Reorder, hide, feature.** Drag the handle (or use the arrows) to reorder projects, skills and testimonials. "Show on site" hides an item without deleting it, and "Featured" makes a project the large card.
- **Backup and restore.** Download all text content as one JSON file. Restore can add only what is missing (safe) or replace everything.
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

## Admin security

- **Sign-in:** the admin password signs a device in for 7 days. The session is a signed, HttpOnly, Secure cookie; the GitHub token never leaves the server.
- **Fingerprint / face unlock:** turn it on from Overview → Security on each device you use. From then on the admin locks after 10 minutes away, and every API request is refused until it is unlocked with a passkey (fingerprint, face or device PIN) or the password. The lock is enforced by the server, so opening `/admin` in a browser does not get around it.
- **Where unlock devices are stored:** `security/passkeys.json` in this repo, written by the admin. It holds credential ids and public keys only, which cannot be used to unlock anything. Adding or removing a device is a commit, so the site rebuilds once.
- Passkeys are tied to the live domain, so they do not work on Vercel preview links (use the password there).
