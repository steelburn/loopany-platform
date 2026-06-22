import { createFileRoute } from '@tanstack/react-router'

/** POST /api/machine/poll — daemon claims this machine's pending runs (Bearer device token). */
export const Route = createFileRoute('/api/machine/poll')({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const auth = request.headers.get('authorization') ?? ''
        const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
        if (!token) return Response.json({ error: 'missing device token' }, { status: 401 })
        const body = (await request.json().catch(() => ({}))) as {
          host?: string
          platform?: string
          arch?: string
          progress?: Array<{ runId: string; step: number; label: string }>
        }
        const { getGateway } = await import('../server/boot.js')
        const r = getGateway().poll(token, body, body.progress)
        return Response.json(r.body, { status: r.status })
      },
    },
  },
})
