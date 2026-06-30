import { createFileRoute } from '@tanstack/react-router'
import { LoopDetailView } from '../components/LoopDetailView'

/**
 * Loop detail PAGE — `/loops/$loopId`. The dedicated page that replaced the old
 * dashboard modal: a loop header + action toolbar, the unified Files panel (task
 * file alongside synced artifacts), and the runs timeline. The view owns its own
 * data + self-poll (ssr:false so the session cookie rides along with its fetches,
 * like the dashboard loader). Run rows link on to `/loops/$loopId/runs/$runId`.
 */
export const Route = createFileRoute('/loops/$loopId')({
  ssr: false,
  component: LoopDetailPage,
})

function LoopDetailPage() {
  const { loopId } = Route.useParams()
  return <LoopDetailView id={loopId} />
}
