import type { ArtifactSummary } from '../types'

/**
 * Pure helpers for the unified Files panel's row list. The loop's task file IS
 * the loop folder's README, so it must appear EXACTLY ONCE — once a sync has
 * landed it shows up as a normal artifact, and we badge THAT row as the task
 * rather than rendering a second synthetic copy. Kept framework-free so the
 * de-duplication is unit-testable without React or the server fns.
 */

/** A row in the unified list: the synthetic task file, or one synced artifact. */
export type FileEntry =
  | { kind: 'task'; path: string }
  | { kind: 'artifact'; path: string; file: ArtifactSummary; task?: boolean }

const basename = (path: string) => path.split('/').pop() || path

/**
 * Does this synced artifact path point at the loop's task file? The stored
 * `job.taskFile` is often an ABSOLUTE machine path (e.g.
 * `/Users/me/work/loop/README.md`) while a synced artifact path is RELATIVE to
 * the watched folder (e.g. `README.md` or `loop/README.md`), so a brittle `===`
 * never matches and the README leaks back in as a duplicate row. Compare on a
 * normalized path instead: equal whole paths, one a path-segment suffix of the
 * other, or (last resort) equal basename.
 */
export function isTaskPath(taskFile: string | undefined, artifactPath: string): boolean {
  if (!taskFile) return false
  const norm = (p: string) => p.replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/+$/, '')
  const a = norm(taskFile)
  const b = norm(artifactPath)
  if (!a || !b) return false
  if (a === b) return true
  // suffix match on whole segments: ".../loop/README.md" endsWith "loop/README.md"
  if (a.endsWith('/' + b) || b.endsWith('/' + a)) return true
  return basename(a) === basename(b)
}

/**
 * Build the unified entry list — the task file FIRST, then the other artifacts
 * (the server already path-sorts them). Exactly one task row in every state:
 *   - task file HAS synced → badge that artifact as the task, drop the duplicate;
 *   - NOT yet synced (no matching artifact) → a single synthetic task entry from
 *     the loop record, so a brand-new loop still shows its spec.
 */
export function buildFileEntries(taskFile: string | undefined, artifacts: ArtifactSummary[]): FileEntry[] {
  const taskArtifact = taskFile ? artifacts.find((f) => isTaskPath(taskFile, f.path)) : undefined
  const out: FileEntry[] = []
  if (taskArtifact) out.push({ kind: 'artifact', path: taskArtifact.path, file: taskArtifact, task: true })
  else if (taskFile) out.push({ kind: 'task', path: taskFile })
  for (const f of artifacts) {
    if (taskArtifact && f.path === taskArtifact.path) continue
    out.push({ kind: 'artifact', path: f.path, file: f })
  }
  return out
}

/** Whether an entry is the task row (synthetic OR a badged artifact). */
export function isTaskEntry(e: FileEntry | null | undefined): boolean {
  return e?.kind === 'task' || (e?.kind === 'artifact' && !!e.task)
}
