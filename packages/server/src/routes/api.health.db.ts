import { createFileRoute } from '@tanstack/react-router'
import { sql } from 'drizzle-orm'

/**
 * DB-touching liveness probe — the ONE home for the 2026-07-09 incident rationale
 * (db/index.ts and the Fly checks point here). Unlike /api/health (which never
 * touches the DB and so reported `ok` right through a ~5.5h outage while a dead
 * postgres-js pool masked it), this runs a trivial `select 1` through the runtime
 * pool. Fly's health check points here so a wedged/dead pool fails the check and
 * Fly auto-restarts the machine — the hard backstop for the one case the pool's
 * own self-healing (max_lifetime / statement_timeout in db/index.ts) can't cover:
 * a fully dead socket layer.
 *
 * 200 → DB reachable; 503 → the query failed or hung. A hung probe is bounded first
 * by Fly's 10s check timeout (which fails the check), with the pool's 30s
 * statement_timeout as the server-side backstop. Drizzle imported inside the
 * handler so it stays out of the client bundle.
 */
export const Route = createFileRoute('/api/health/db')({
  server: {
    handlers: {
      GET: async () => {
        try {
          const { db } = await import('../db/index.js')
          await db.execute(sql`select 1`)
          return Response.json({ ok: true, db: 'up' })
        } catch (err) {
          return Response.json(
            { ok: false, db: 'down', error: err instanceof Error ? err.message : String(err) },
            { status: 503 },
          )
        }
      },
    },
  },
})
