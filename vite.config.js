import { defineConfig } from 'vite'

// GitHub Pages serves the site from /<repo-name>/, so it needs that base path.
// Vercel serves from the domain root, so base must be '/' there.
// Vercel sets the VERCEL env var automatically during its build — we use that
// to pick the right base without needing two separate config files.
export default defineConfig({
  base: process.env.VERCEL ? '/' : '/habitable-zone-atlas/',
})
