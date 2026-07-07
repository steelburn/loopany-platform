import { useMemo } from 'react'
import { renderMarkdown } from '../lib/markdown'
import { useArtifactLinkClick } from './artifactLinkContext'

/**
 * Renders markdown (a loop's task file, or any `.md` artifact) as a calm,
 * formatted document instead of a raw mono dump. Pipeline: the shared
 * `renderMarkdown` (marked GFM → DOMPurify allowlist) → `.taskmd` styles.
 * Bare prose only — the host (the unified Files viewer) owns the surface,
 * padding cadence, and scroll.
 *
 * The onClick routes artifact-internal relative links through the shared
 * resolver (see artifactLinkContext) so cross-references open the target file
 * instead of navigating the browser to a dead app route; inert without a
 * provider, so this stays a plain markdown renderer everywhere it's used.
 */
export function TaskFileView({ content }: { content: string }) {
  const html = useMemo(() => renderMarkdown(content), [content])
  const onClick = useArtifactLinkClick()

  return <div className="taskmd px-5 py-4" onClick={onClick} dangerouslySetInnerHTML={{ __html: html }} />
}
