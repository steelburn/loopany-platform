/**
 * Link resolution for markdown rendered inside the Files viewer. Artifacts
 * cross-reference each other with relative paths (`tickets/SUP-71.md`,
 * `../signals/FB-1.md`); left alone, the browser resolves those against the
 * PAGE url and navigates to a dead app route. The panel intercepts clicks and
 * asks this pure helper what the link means:
 *
 * - `external` — a scheme/protocol-relative/#fragment link; let the browser
 *   handle it (http(s) anchors are new-tabbed by the markdown pipeline).
 * - `open`     — resolves to a synced artifact; the panel opens it in place.
 * - `dead`     — relative but matches nothing synced; suppress the navigation
 *   (a broken in-app 404 helps nobody).
 *
 * A leading `/` is treated as loop-root-relative, not web-app-absolute:
 * artifact authors mean the loop's file tree, never the dashboard's routes.
 */

export type ArtifactLink = { kind: 'open'; path: string } | { kind: 'external' } | { kind: 'dead' }

/** Collapse `.` / `..` segments; returns null when `..` escapes the root. */
function normalizeSegments(path: string): string | null {
  const out: string[] = []
  for (const seg of path.split('/')) {
    if (!seg || seg === '.') continue
    if (seg === '..') {
      if (!out.length) return null // escapes the loop tree — not a synced path
      out.pop()
      continue
    }
    out.push(seg)
  }
  return out.join('/')
}

/** Drop leading `./` and `../` segments, keeping the meaningful tail. */
function stripLeadingUp(path: string): string {
  const segs = path.split('/').filter((s) => s && s !== '.')
  while (segs.length && segs[0] === '..') segs.shift()
  return segs.join('/')
}

export function resolveArtifactLink(
  rawHref: string | null | undefined,
  currentPath: string,
  knownPaths: readonly string[],
): ArtifactLink {
  const href = (rawHref ?? '').trim()
  if (!href || href.startsWith('#')) return { kind: 'external' }
  // scheme: (http:, https:, mailto:, …) or protocol-relative — the browser's job.
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(href) || href.startsWith('//')) return { kind: 'external' }

  // Percent-decode defensively (marked encodes spaces etc.); a malformed
  // encoding falls back to the raw string rather than throwing.
  let decoded = href
  try {
    decoded = decodeURI(href)
  } catch {
    /* keep raw */
  }
  const [pathPart] = decoded.split(/[?#]/) // strip query/fragment for matching
  if (!pathPart) return { kind: 'external' }

  const known = new Set(knownPaths)
  const candidates: Array<string | null> = pathPart.startsWith('/')
    ? [normalizeSegments(pathPart)] // loop-root-relative
    : [
        // relative to the current file's directory first…
        normalizeSegments([currentPath.split('/').slice(0, -1).join('/'), pathPart].filter(Boolean).join('/')),
        // …then loop-root-relative as a fallback (how authors often write them)
        normalizeSegments(pathPart),
      ]
  for (const c of candidates) {
    if (c && known.has(c)) return { kind: 'open', path: c }
  }

  // Re-anchor an over-climbing link. Artifacts reference each other by ON-DISK
  // relative paths (`../../tickets/SUP-71.md` — the loop folder sits levels deep
  // in the repo), but sync RE-ROOTS the tree: the loop folder becomes root and a
  // syncPaths folder sits at its prefix (`tickets/…`). So the `..` hops overshoot
  // the synced root. Recover the intent by the meaningful tail: drop leading
  // `../` and match the remainder against a synced path (exact, then a UNIQUE
  // path-suffix so an ambiguous tail stays dead rather than opening the wrong file).
  const tail = stripLeadingUp(pathPart)
  if (tail) {
    if (known.has(tail)) return { kind: 'open', path: tail }
    const suffixed = [...known].filter((k) => k.endsWith('/' + tail))
    if (suffixed.length === 1) return { kind: 'open', path: suffixed[0]! }
  }
  return { kind: 'dead' }
}
