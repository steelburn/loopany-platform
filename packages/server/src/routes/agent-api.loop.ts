import { createFileRoute } from '@tanstack/react-router'

/** POST /agent-api/loop — the `loopany` shim's verbs (Bearer run token). */
export const Route = createFileRoute('/agent-api/loop')({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const auth = request.headers.get('authorization') ?? ''
        const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
        if (!token) return Response.json({ text: 'loopany: missing token', exitCode: 1 }, { status: 401 })
        const body = (await request.json().catch(() => ({}))) as { argv?: string[] }
        const { getGateway } = await import('../server/boot.js')
        const r = getGateway().agentApi(token, Array.isArray(body.argv) ? body.argv : [])
        return Response.json(r.body, { status: r.status })
      },
    },
  },
})
