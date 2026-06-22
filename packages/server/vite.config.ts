import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { nitro } from 'nitro/vite'
import viteReact from '@vitejs/plugin-react'

export default defineConfig({
  // Bind IPv4 127.0.0.1 (not the default IPv6 `localhost`) so the daemon + curl
  // reach the dev server at 127.0.0.1 consistently.
  server: { host: '127.0.0.1', port: Number(process.env.LOOPANY_PORT) || 3000, strictPort: !!process.env.LOOPANY_PORT },
  plugins: [
    tailwindcss(),
    tanstackStart(),
    // Nitro builds the production server (default node-server preset → a
    // listening `.output/server/index.mjs`, started by `pnpm start`).
    nitro(),
    // react's vite plugin must come after start's vite plugin
    viteReact(),
  ],
})
