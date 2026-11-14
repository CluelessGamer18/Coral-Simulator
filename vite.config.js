import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { copyFileSync } from 'node:fs'
import { resolve } from 'node:path'

// Static hosts (GitHub Pages and the like) answer an address they have no file for, such as /about after a
// refresh, with 404.html. A copy of index.html there lets the app start and show the right page itself.
function spaFallback() {
  let outDir;
  return {
    name: 'spa-fallback',
    apply: 'build',
    configResolved(config) { outDir = config.build.outDir; },
    closeBundle() { copyFileSync(resolve(outDir, 'index.html'), resolve(outDir, '404.html')); },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), spaFallback()],
  build: {
    // Phaser is about 1.2 MB before compression and can't be split further. It's only fetched with the game
    // (see the lazy imports in App.jsx), and in its own file it stays cached when the game's code changes.
    chunkSizeWarningLimit: 1300,
    rollupOptions: {
      output: {
        manualChunks: (id) => id.includes('node_modules/phaser/') ? 'phaser' : undefined,
      },
    },
  },
})
