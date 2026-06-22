import { createFileRoute } from '@tanstack/react-router'

/**
 * Dev/seed admin endpoint — action-dispatch over POST (no path params, to keep
 * route codegen simple). Used by scripts + the headless e2e against the unified
 * server. Localhost/dev only; not part of the product UI surface.
 *
 *   { action: 'register-machine', name, token, roots? }
 *   { action: 'create-loop', machineId, cron, name?, task?, notify?, nextRunAt? }
 *   { action: 'run-loop', id }
 *   { action: 'evolve', id }
 *   { action: 'list-runs', id }
 *   { action: 'list-jobs' }
 */
export const Route = createFileRoute('/api/admin')({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const b = (await request.json().catch(() => ({}))) as Record<string, any>
        const store = await import('../db/store.js')
        const { scheduler } = await import('../server/boot.js').then((m) => m.ensureServer())
        const { machineIdFromToken, sha256 } = await import('../gateway/tokens.js')

        switch (b.action) {
          case 'register-machine': {
            if (!b.token || !b.name) return Response.json({ error: 'token + name required' }, { status: 400 })
            const id = machineIdFromToken(b.token)
            const machine = store.getMachine(id)
              ? store.updateMachine(id, { name: b.name, roots: b.roots ?? null })
              : store.createMachine({ id, userId: 'shared', name: b.name, tokenHash: sha256(b.token), roots: b.roots ?? null, online: false })
            return Response.json({ machine })
          }
          case 'create-loop': {
            if (!b.machineId || !b.cron) return Response.json({ error: 'machineId + cron required' }, { status: 400 })
            const loop = store.createLoop({
              userId: 'shared',
              machineId: b.machineId,
              name: b.name ?? null,
              cron: b.cron,
              task: b.task ?? null,
              workdir: b.workdir ?? null,
              taskFile: b.taskFile ?? null,
              workflow: b.workflow ?? null,
              stateSchema: store.coerceStateSchema(b.stateSchema) ?? null,
              ui: store.coerceUi(b.ui) ?? null,
              notify: b.notify ?? 'auto',
              allowControl: !!b.allowControl,
              model: b.model ?? null,
              enabled: b.enabled ?? true,
              nextRunAt: b.nextRunAt ?? null,
            })
            scheduler.addLoop(loop)
            return Response.json({ loop })
          }
          case 'run-loop': {
            if (!store.getLoop(b.id)) return Response.json({ error: 'not found' }, { status: 404 })
            scheduler.runNow(b.id)
            return Response.json({ ok: true })
          }
          case 'evolve': {
            const loop = store.getLoop(b.id)
            if (!loop) return Response.json({ error: 'not found' }, { status: 404 })
            return Response.json({ ok: scheduler.evolveNow(b.id), canEvolve: store.canEvolve(loop) })
          }
          case 'list-runs':
            return Response.json(store.listRuns(b.id, 50))
          case 'list-jobs':
            return Response.json(store.listLoops())
          default:
            return Response.json({ error: `unknown action ${b.action}` }, { status: 400 })
        }
      },
    },
  },
})
