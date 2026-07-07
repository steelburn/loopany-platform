import { createContext, useContext, type MouseEvent } from 'react'
import { resolveArtifactLink } from '../lib/artifactLinks'

/**
 * Makes relative links inside rendered artifact markdown work instead of
 * 404ing. A markdown surface (the Files viewer, or a dashboard embed/calendar/
 * kanban detail) publishes its context — the file being shown, every synced
 * path, and what "open" means here — and `TaskFileView` reads it to intercept
 * anchor clicks (see lib/artifactLinks.ts for the pure resolution rules).
 *
 * Without a provider the hook is inert, so `TaskFileView` stays usable anywhere.
 */
export type ArtifactLinkTarget = {
  /** Path of the file currently rendered (relative links resolve against its dir). */
  current: string
  /** Every synced artifact path — a link resolving outside this set is "dead". */
  known: readonly string[]
  /** Open a resolved sibling artifact (switch the viewer / navigate to Files). */
  onOpen: (path: string) => void
}

const Ctx = createContext<ArtifactLinkTarget | null>(null)

export const ArtifactLinks = Ctx.Provider

/** Delegated click handler for a rendered-markdown container: an internal
 *  relative link opens its synced target (or is suppressed if it points at
 *  nothing synced — never a dead in-app navigation); external and `#fragment`
 *  links fall through to the browser. A no-op when no provider is present. */
export function useArtifactLinkClick(): (ev: MouseEvent) => void {
  const target = useContext(Ctx)
  return (ev) => {
    if (!target) return
    const a = (ev.target as Element).closest?.('a')
    if (!a || !ev.currentTarget.contains(a)) return
    const link = resolveArtifactLink(a.getAttribute('href'), target.current, target.known)
    if (link.kind === 'external') return
    ev.preventDefault()
    if (link.kind === 'open') target.onOpen(link.path)
  }
}
