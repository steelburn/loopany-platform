import { describe, expect, it } from 'vitest'
import { resolveArtifactLink } from './artifactLinks'

const PATHS = ['README.md', 'tickets/SUP-71.md', 'signals/FB-1.md', 'reports/2026/jan.md', 'a b/spaced file.md']

describe('resolveArtifactLink', () => {
  it('opens a loop-root-relative reference from a root file', () => {
    expect(resolveArtifactLink('tickets/SUP-71.md', 'README.md', PATHS)).toEqual({
      kind: 'open',
      path: 'tickets/SUP-71.md',
    })
  })

  it('resolves relative to the current file directory first', () => {
    expect(resolveArtifactLink('SUP-71.md', 'tickets/other.md', PATHS)).toEqual({
      kind: 'open',
      path: 'tickets/SUP-71.md',
    })
    expect(resolveArtifactLink('../signals/FB-1.md', 'tickets/SUP-71.md', PATHS)).toEqual({
      kind: 'open',
      path: 'signals/FB-1.md',
    })
  })

  it('falls back to loop-root-relative when the dir-relative miss', () => {
    // from inside tickets/, "signals/FB-1.md" is not tickets/signals/… — root wins
    expect(resolveArtifactLink('signals/FB-1.md', 'tickets/SUP-71.md', PATHS)).toEqual({
      kind: 'open',
      path: 'signals/FB-1.md',
    })
  })

  it('treats a leading slash as loop-root, never the web app', () => {
    expect(resolveArtifactLink('/tickets/SUP-71.md', 'README.md', PATHS)).toEqual({
      kind: 'open',
      path: 'tickets/SUP-71.md',
    })
  })

  it('handles ./ prefixes, query/fragment suffixes, and percent-encoding', () => {
    expect(resolveArtifactLink('./tickets/SUP-71.md', 'README.md', PATHS)).toEqual({
      kind: 'open',
      path: 'tickets/SUP-71.md',
    })
    expect(resolveArtifactLink('tickets/SUP-71.md#heading', 'README.md', PATHS)).toEqual({
      kind: 'open',
      path: 'tickets/SUP-71.md',
    })
    expect(resolveArtifactLink('a%20b/spaced%20file.md', 'README.md', PATHS)).toEqual({
      kind: 'open',
      path: 'a b/spaced file.md',
    })
  })

  it('re-anchors an over-climbing on-disk link onto the re-rooted synced tree', () => {
    // sync re-roots: the loop folder is root, syncPaths folders sit at their
    // prefix. A file written with `../../tickets/X` (on-disk relative, loop dir
    // is levels deep) must still resolve to the synced `tickets/X`.
    expect(resolveArtifactLink('../../tickets/SUP-71.md', 'SUP-71.md', PATHS)).toEqual({
      kind: 'open',
      path: 'tickets/SUP-71.md',
    })
    expect(resolveArtifactLink('../../signals/FB-1.md', 'reports/2026/jan.md', PATHS)).toEqual({
      kind: 'open',
      path: 'signals/FB-1.md',
    })
  })

  it('re-anchors by a unique path-suffix, but stays dead when ambiguous', () => {
    const paths = ['a/dup.md', 'b/dup.md', 'x/only.md']
    expect(resolveArtifactLink('../only.md', 'q/r.md', paths)).toEqual({ kind: 'open', path: 'x/only.md' })
    expect(resolveArtifactLink('../dup.md', 'q/r.md', paths)).toEqual({ kind: 'dead' }) // two matches → refuse
  })

  it('is dead when the target is not synced (suppress, never 404)', () => {
    expect(resolveArtifactLink('tickets/NOPE.md', 'README.md', PATHS)).toEqual({ kind: 'dead' })
    expect(resolveArtifactLink('../../outside.md', 'README.md', PATHS)).toEqual({ kind: 'dead' })
  })

  it('leaves external and fragment links to the browser', () => {
    expect(resolveArtifactLink('https://x.test/y', 'README.md', PATHS)).toEqual({ kind: 'external' })
    expect(resolveArtifactLink('mailto:a@b.c', 'README.md', PATHS)).toEqual({ kind: 'external' })
    expect(resolveArtifactLink('//cdn.x.test/y', 'README.md', PATHS)).toEqual({ kind: 'external' })
    expect(resolveArtifactLink('#section', 'README.md', PATHS)).toEqual({ kind: 'external' })
    expect(resolveArtifactLink('', 'README.md', PATHS)).toEqual({ kind: 'external' })
  })
})
