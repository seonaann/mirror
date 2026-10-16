import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// `npm run dev` / `npm run build`      -> normal website build (unchanged behaviour).
// `npm run build:extension`            -> same React app, emitted into ../mirror-extension/ui
//                                         with relative asset paths so it works under chrome-extension://
export default defineConfig(({ mode }) => {
  const extension = mode === 'extension'
  return {
    plugins: [react(), tailwindcss()],
    base: extension ? './' : '/',
    build: extension
      ? {
          outDir: fileURLToPath(new URL('../mirror-extension/ui', import.meta.url)),
          emptyOutDir: true, // outDir is outside the project root, so opt in explicitly
        }
      : {},
  }
})
