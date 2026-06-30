import { useEffect, useRef, useState } from 'react'
import { createFileRoute, useNavigate, useRouter } from '@tanstack/react-router'
import { Tooltip } from '@base-ui/react/tooltip'
import { getAuthState, listJobs, listMyTeams, listTemplates } from '../server/loopApi'
import { listMachines } from '../server/machineFns'
import { authClient, useSession } from '../lib/auth-client'
import type { RunSummary, TemplateInfo } from '../types'
import { isDone } from '../lib/format'
import { LoopCard } from '../components/LoopCard'
import { TeamSwitcher } from '../components/TeamSwitcher'
import { MachinesModal } from '../components/MachinesModal'
import { NotificationsModal } from '../components/NotificationsModal'
import { ComposeModal } from '../components/ComposeModal'
import { LoopLogo } from '../components/LoopLogo'
import { SignIn } from '../components/SignIn'

export const Route = createFileRoute('/')({
  ssr: false,
  loader: async () => {
    const auth = await getAuthState()
    // Skip the data fetch only while the visitor is unauthenticated (the sign-in
    // CTA renders then). Once signed in, fetch — the loader (ssr:false) runs in
    // the browser so the session cookie rides along. Without the session check
    // here, the gate would leave the dashboard permanently empty after sign-in.
    if (auth.enabled) {
      const { data: session } = await authClient.getSession()
      if (!session) return { jobs: [], templates: [], machines: [], teams: undefined, auth }
    }
    const [jobs, templates, machines, teams] = await Promise.all([
      listJobs(),
      listTemplates(),
      listMachines(),
      listMyTeams(),
    ])
    return { jobs, templates, machines, teams, auth }
  },
  component: Gate,
})

/** Auth gate (only when a GitHub OAuth app is configured; otherwise open). Keeps
 *  Dashboard's hooks isolated so the gate never changes hook order. */
function Gate() {
  const { auth } = Route.useLoaderData() ?? { auth: { enabled: false } }
  const { data: session, isPending } = useSession()
  if (auth?.enabled && !isPending && !session) return <SignIn />
  return <Dashboard />
}

function Dashboard() {
  const { jobs = [], templates = [], machines = [], teams } = Route.useLoaderData() ?? {}
  const online = machines.filter((m) => m.online).length
  const router = useRouter()
  const navigate = useNavigate()
  const [compose, setCompose] = useState<{ open: boolean; template: TemplateInfo | null }>({
    open: false,
    template: null,
  })
  const [machinesOpen, setMachinesOpen] = useState(false)
  const [notifyOpen, setNotifyOpen] = useState(false)

  // Poll the loader, but never while a modal is open (avoid disrupting a
  // compose in progress). A ref keeps the interval reading current state.
  // Speed up to 3s while any loop is executing so its run block + Running badge
  // surface (and settle into a finished block) without a manual refresh.
  const openRef = useRef(false)
  openRef.current = compose.open || machinesOpen || notifyOpen
  const anyRunning = jobs.some((j) => j.running)
  useEffect(() => {
    const t = setInterval(
      () => {
        if (!openRef.current) void router.invalidate()
      },
      anyRunning ? 3_000 : 10_000,
    )
    return () => clearInterval(t)
  }, [router, anyRunning])

  const refresh = () => void router.invalidate()
  const done = jobs.filter(isDone)
  const active = jobs.filter((j) => !isDone(j))
  const activeOn = active.filter((j) => j.enabled).length

  const cardProps = () => ({
    onOpen: (id: string) => void navigate({ to: '/loops/$loopId', params: { loopId: id } }),
    onPickRun: (jobId: string, run: RunSummary) =>
      void navigate({ to: '/loops/$loopId/runs/$runId', params: { loopId: jobId, runId: run.id } }),
  })

  return (
    <Tooltip.Provider delay={120}>
      <main className="mx-auto max-w-[1180px] px-8 pb-24 pt-12">
        <header className="mb-9 flex items-start justify-between gap-4">
          <div className="flex items-center gap-8">
            <LoopLogo size={52} />
            <div>
              <div className="mb-2 font-mono text-[11px] tracking-[0.28em] text-secondary">
                Scheduled Agent Loops
              </div>
              <h1 className="font-display text-[52px] font-medium leading-none tracking-tight text-display">
                LoopAny
              </h1>
            </div>
          </div>
          <div className="mt-1 flex shrink-0 items-center gap-2">
            <TeamSwitcher data={teams} />
            <button
              onClick={() => setNotifyOpen(true)}
              className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md border border-wire bg-surface px-3 py-2 font-mono text-[12px] tracking-[0.08em] text-secondary transition-colors hover:border-display hover:text-display"
            >
              Notifications
            </button>
            <button
              onClick={() => setMachinesOpen(true)}
              className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md border border-wire bg-surface px-3 py-2 font-mono text-[12px] tracking-[0.08em] text-secondary transition-colors hover:border-display hover:text-display"
            >
              <span
                className={`inline-block h-1.5 w-1.5 rounded-full ${online ? 'bg-[color:var(--color-ok,#16a34a)]' : 'bg-disabled'}`}
              />
              {online} {online === 1 ? 'Machine' : 'Machines'} Online
            </button>
          </div>
        </header>

        {/* toolbar: New Loop + template tiles */}
        <div className="flex flex-wrap items-stretch gap-3">
          <button
            onClick={() => setCompose({ open: true, template: null })}
            className="flex w-40 cursor-pointer flex-col justify-center gap-1.5 rounded-lg bg-display px-5 py-4 text-paper transition-opacity hover:opacity-80"
          >
            <span className="font-display text-2xl leading-none">+</span>
            <span className="font-mono text-[12px] tracking-[0.08em]">New Loop</span>
          </button>
          {templates.map((t) => (
            <button
              key={t.name}
              onClick={() => setCompose({ open: true, template: t })}
              className="min-w-[200px] flex-1 cursor-pointer rounded-lg border border-wire bg-surface px-5 py-4 text-left transition-colors hover:border-display"
            >
              <div className="mb-1.5 text-[15px] font-medium text-display">{t.label}</div>
              <div className="text-[13px] leading-snug text-secondary">{t.desc}</div>
            </button>
          ))}
        </div>

        <div className="my-8 h-px bg-hairline" />

        <div className="mb-5 flex items-baseline gap-3">
          <span className="font-mono text-[12px] tracking-[0.12em] text-display">
            Active Loops
          </span>
          <span className="font-mono text-[11px] tracking-[0.04em] text-secondary">
            {active.length ? `${activeOn} SCHEDULED · ${active.length} TOTAL` : ''}
          </span>
        </div>

        {active.length ? (
          active.map((j) => <LoopCard key={j.id} job={j} {...cardProps()} />)
        ) : (
          <div className="py-16 text-center">
            <div className="text-[15px] text-secondary">
              {jobs.length ? 'No active loops' : 'No loops yet'}
            </div>
            {!jobs.length && (
              <div className="mt-1.5 text-[13px] text-disabled">
                Click New Loop or a template to start.
              </div>
            )}
          </div>
        )}

        {done.length > 0 && (
          <>
            <div className="mb-5 mt-11 flex items-baseline gap-3">
              <span className="font-mono text-[12px] tracking-[0.12em] text-display">
                Done
              </span>
              <span className="font-mono text-[11px] tracking-[0.04em] text-secondary">
                {done.length} COMPLETED
              </span>
            </div>
            {done.map((j) => (
              <LoopCard key={j.id} job={j} {...cardProps()} />
            ))}
          </>
        )}
      </main>

      <ComposeModal
        open={compose.open}
        onClose={() => setCompose({ open: false, template: null })}
        onCreated={refresh}
      />

      <MachinesModal open={machinesOpen} onClose={() => setMachinesOpen(false)} />

      <NotificationsModal open={notifyOpen} onClose={() => setNotifyOpen(false)} />
    </Tooltip.Provider>
  )
}
