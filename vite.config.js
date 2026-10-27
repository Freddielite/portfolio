import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Absolute base. The site is served from the root of its domain (Vercel), and
// blog posts are pre-rendered to /blog/<slug>/index.html, so relative asset
// paths would resolve to /blog/assets/... and a direct visit or refresh on a
// post would load a blank page. If you ever host from a subpath (for example
// a GitHub Pages project site), change this to that subpath, e.g. '/repo-name/'.
export default defineConfig({
  plugins: [react()],
  base: '/',
})
