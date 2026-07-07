import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * Regression guard for artifact-internal links in rendered markdown.
 *
 * Artifact markdown cross-references other artifacts with relative paths
 * (`../../tickets/SUP-71.md`). Rendered as plain anchors, the browser resolved
 * those against the PAGE url and navigated to a dead app route (a real bug:
 * clicking a canonical link landed on /tickets/SUP-71.md → not found).
 *
 * Two invariants:
 *  1. Interception lives at the SHARED renderer (`TaskFileView`) via a context,
 *     so EVERY surface showing artifact markdown is covered — the Files viewer
 *     AND the dashboard primitives (embed/calendar/kanban) — not just one.
 *  2. A resolved link opens the target INLINE in the shared preview modal
 *     (`ArtifactPreview`), which stacks for multi-level navigation; it never
 *     navigates the browser.
 */
const read = (name: string) => readFileSync(fileURLToPath(new URL(`./${name}`, import.meta.url)), 'utf8')
const ctx = read('artifactLinkContext.tsx')
const taskView = read('TaskFileView.tsx')
const preview = read('ArtifactPreview.tsx')
const detail = read('LoopDetailView.tsx')
const surfaces = {
  LoopFilesPanel: read('LoopFilesPanel.tsx'),
  LoopEmbed: read('LoopEmbed.tsx'),
  LoopCalendar: read('LoopCalendar.tsx'),
  LoopKanban: read('LoopKanban.tsx'),
}

describe('artifact link interception', () => {
  it('the shared context routes clicks through the pure resolver', () => {
    expect(ctx).toMatch(/resolveArtifactLink\(/)
    expect(ctx).toMatch(/getAttribute\('href'\)/) // raw attribute, never the page-resolved .href
    expect(ctx).toMatch(/preventDefault\(\)/)
    expect(ctx).toMatch(/kind === 'external'\) return/) // external links pass through
  })

  it('the shared markdown renderer attaches the handler', () => {
    expect(taskView).toMatch(/useArtifactLinkClick\(\)/)
    expect(taskView).toMatch(/onClick=\{onClick\}/)
  })

  it('every markdown surface routes internal links to the inline preview modal', () => {
    for (const [name, src] of Object.entries(surfaces)) {
      expect(src, name).toMatch(/useArtifactPreview\(\)/)
      expect(src, name).toMatch(/onOpen: openPreview/)
    }
  })

  it('the preview modal stacks for multi-level navigation with a breadcrumb', () => {
    expect(preview).toMatch(/ArtifactPreviewProvider/)
    expect(preview).toMatch(/\[\.\.\.s, path\]/) // pushes onto the nav stack
    expect(preview).toMatch(/s\.slice\(0, i \+ 1\)/) // breadcrumb truncates back to a level
    expect(preview).toMatch(/<ArtifactBody/) // renders the target inline
    expect(detail).toMatch(/<ArtifactPreviewProvider loopId=\{id\}/) // mounted on the loop page
  })
})
