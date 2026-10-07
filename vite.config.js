import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// Base path is configurable for static hosts (GitHub Pages subpath etc.)
// e.g. VITE_BASE=/result-search-static/ npm run build
// https://vite.dev/config/
export default defineConfig({
  base: process.env.VITE_BASE || '/',
  plugins: [react(), tailwindcss()],
  worker: { format: 'es' },
  build: {
    // tesseract.js loads its OCR engine from CDN at runtime; keep pdf.js worker bundled
    chunkSizeWarningLimit: 1200,
  },
})
