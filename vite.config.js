import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Relative base so the build works when hosted from a subpath
// (e.g. GitHub Pages project sites: username.github.io/repo-name/).
// If you deploy to Netlify/Vercel on a root domain, this still works fine.
export default defineConfig({
  plugins: [react()],
  base: './',
})
