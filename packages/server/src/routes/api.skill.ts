import { createFileRoute } from '@tanstack/react-router'
// Inlined at build time (Vite ?raw) so it ships in the nitro bundle. Served from
// a server route (not /public) so we control the charset — static .md serving
// omits `charset=utf-8`, which garbles the UTF-8 content for some clients. A
// non-extension path (/api/skill) is used because Vite's dev static layer would
// otherwise swallow a `.md` path before the route runs.
import skill from '../SKILL.md?raw'

/** GET /api/skill — the loop-builder skill Claude Code follows (see ComposeModal). */
export const Route = createFileRoute('/api/skill')({
  server: {
    handlers: {
      GET: () =>
        new Response(skill, {
          headers: { 'content-type': 'text/markdown; charset=utf-8', 'cache-control': 'no-cache' },
        }),
    },
  },
})
