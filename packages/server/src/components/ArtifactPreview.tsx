import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ArtifactSummary } from '../types'
import { getArtifacts } from '../server/loopApi'
import { Modal, ModalHead } from './Modal'
import { ArtifactBody } from './artifactView'
import { ArtifactLinks } from './artifactLinkContext'

const basename = (p: string) => p.split('/').pop() || p

type PreviewApi = {
  /** Preview an artifact inline (opens/deepens the shared modal). */
  open: (path: string) => void
  /** Every synced artifact path — feeds relative-link resolution. */
  known: readonly string[]
}

const Ctx = createContext<PreviewApi>({ open: () => {}, known: [] })

/** Trigger the shared artifact preview modal from any markdown surface. */
export function useArtifactPreview(): PreviewApi {
  return useContext(Ctx)
}

/**
 * ONE modal for viewing an artifact inline — the target of an internal markdown
 * link, opened from ANY surface (Files viewer, dashboard embed/calendar/kanban).
 * It holds a navigation STACK: a link inside the previewed file opens the next
 * level in the SAME modal, and a breadcrumb hops back to any earlier level
 * (multi-level deep). Fetches the loop's artifact list so it can resolve a path
 * to its `ArtifactSummary` (for the body) and feed nested link resolution.
 */
export function ArtifactPreviewProvider({
  loopId,
  running,
  children,
}: {
  loopId: string
  running?: boolean
  children: React.ReactNode
}) {
  const [artifacts, setArtifacts] = useState<ArtifactSummary[] | null>(null)
  const [stack, setStack] = useState<string[]>([])
  const seq = useRef(0)

  const refresh = useCallback(() => {
    const mine = ++seq.current
    getArtifacts({ data: { loopId } })
      .then((list) => mine === seq.current && setArtifacts(list))
      .catch(() => {})
  }, [loopId])

  useEffect(() => {
    setArtifacts(null)
    setStack([])
    refresh()
  }, [loopId, refresh])

  // Keep the list fresh while the loop writes files, so a just-synced target resolves.
  useEffect(() => {
    const t = setInterval(refresh, running ? 4_000 : 12_000)
    return () => clearInterval(t)
  }, [running, refresh])

  const open = useCallback((path: string) => {
    // Re-opening the level you're already on is a no-op (a self-link).
    setStack((s) => (s[s.length - 1] === path ? s : [...s, path]))
  }, [])
  const close = useCallback(() => setStack([]), [])

  const known = useMemo(() => (artifacts ?? []).map((a) => a.path), [artifacts])
  const api = useMemo(() => ({ open, known }), [open, known])

  const top = stack[stack.length - 1]
  const file = top ? (artifacts ?? []).find((a) => a.path === top) : undefined

  return (
    <Ctx.Provider value={api}>
      {children}
      {top && (
        <Modal open onClose={close}>
          <ModalHead title={basename(top)} sub={<span className="break-all font-mono">{top}</span>} />
          {/* Breadcrumb — hop back to any earlier level of the navigation stack. */}
          {stack.length > 1 && (
            <nav className="mt-2 flex flex-wrap items-center gap-1 text-caption">
              {stack.map((p, i) => (
                <span key={`${p}-${i}`} className="flex items-center gap-1">
                  {i > 0 && <span aria-hidden className="text-disabled">/</span>}
                  {i === stack.length - 1 ? (
                    <span className="font-medium text-display">{basename(p)}</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setStack((s) => s.slice(0, i + 1))}
                      className="cursor-pointer border-none bg-transparent p-0 text-secondary underline underline-offset-2 transition-colors hover:text-display"
                    >
                      {basename(p)}
                    </button>
                  )}
                </span>
              ))}
            </nav>
          )}
          <div className="mt-4 min-w-0 overflow-hidden rounded-card border border-hairline bg-surface">
            {file ? (
              <ArtifactLinks value={{ current: top, known, onOpen: open }}>
                <ArtifactBody loopId={loopId} file={file} />
              </ArtifactLinks>
            ) : artifacts == null ? (
              <div className="px-5 py-6 text-body text-disabled">Loading…</div>
            ) : (
              <div className="px-5 py-6 text-body text-disabled">
                This file isn’t synced yet. It appears here after the loop’s next run syncs it.
              </div>
            )}
          </div>
        </Modal>
      )}
    </Ctx.Provider>
  )
}
