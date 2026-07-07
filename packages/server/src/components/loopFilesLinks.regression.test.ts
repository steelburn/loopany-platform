import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * Regression guard for artifact-internal links in the Files viewer.
 *
 * Artifact markdown cross-references other artifacts with relative paths
 * (`tickets/SUP-71.md`). Rendered as plain anchors, the browser resolved those
 * against the PAGE url and navigated to a dead app route (a real bug: clicking
 * "Canonical: tickets/SUP-71.md" landed on /tickets/SUP-71.md → not found).
 * The panel must intercept clicks and route them through the pure resolver:
 * open synced targets in place, suppress dead relative links, and leave
 * external links to the browser.
 */
const src = readFileSync(fileURLToPath(new URL('./LoopFilesPanel.tsx', import.meta.url)), 'utf8')

describe('Files viewer link interception', () => {
  it('routes viewer clicks through resolveArtifactLink', () => {
    expect(src).toMatch(/resolveArtifactLink\(/)
    expect(src).toMatch(/getAttribute\('href'\)/) // raw attribute, never the page-resolved .href
    expect(src).toMatch(/preventDefault\(\)/)
    expect(src).toMatch(/setSelected\(link\.path\)/) // opens the target in the panel
  })

  it("lets external links through (only relative ones are the panel's business)", () => {
    expect(src).toMatch(/kind === 'external'\) return/)
  })
})
