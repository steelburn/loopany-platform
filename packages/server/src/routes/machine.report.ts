import { createFileRoute } from '@tanstack/react-router'

/** POST /machine/report — finalize a run (Bearer run token). */
export const Route = createFileRoute('/machine/report')({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const auth = request.headers.get('authorization') ?? ''
        const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
        if (!token) return Response.json({ error: 'missing token' }, { status: 401 })
        const body = await request.json().catch(() => ({}))
        const { getGateway } = await import('../server/boot.js')
        const r = getGateway().report(token, body)
        return Response.json(r.body, { status: r.status })
      },
    },
  },
})
