import { useState } from 'react'
import type { ArtifactContent, ArtifactSummary } from '../types'
import { fmt } from '../lib/format'
import { getArtifact } from '../server/loopApi'

/** Human byte size — "1.8 KB", "3.4 MB". */
export function fmtBytes(n: number | null): string {
  if (n == null) return ''
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

/** Download URL for one artifact — the path is segment-encoded so a nested path
 *  (`data/raw.json`) round-trips and can't be mistaken for extra route segments. */
export function downloadHref(loopId: string, path: string): string {
  const enc = path
    .split('/')
    .map(encodeURIComponent)
    .join('/')
  return `/api/artifact/${encodeURIComponent(loopId)}/${enc}`
}

type Loaded = ArtifactContent | { loading: true }

/**
 * One artifact row, shared by the loop "Files" view (Phase 2) and the run-detail
 * recorded-files list (historical runs with no snapshot). A text file expands its
 * content inline (lazy `getArtifact`), a binary/oversize file is a download link.
 * Owns its own expand+fetch state so it can be dropped into either list.
 */
export function ArtifactFileRow({ loopId, file }: { loopId: string; file: ArtifactSummary }) {
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const downloadable = file.binary && !file.oversize

  async function toggle() {
    // Binary/oversize are download-only — no inline expand.
    if (file.binary || file.oversize) return
    if (loaded) {
      setLoaded(null)
      return
    }
    setLoaded({ loading: true })
    try {
      setLoaded(await getArtifact({ data: { loopId, path: file.path } }))
    } catch (e) {
      setLoaded({ error: String(e) })
    }
  }

  return (
    <li className="font-mono text-[12.5px]">
      <div className="flex items-baseline gap-2">
        {downloadable ? (
          <a
            href={downloadHref(loopId, file.path)}
            download
            className="break-all text-interactive underline underline-offset-2 transition-colors hover:text-display"
          >
            {file.path}
          </a>
        ) : file.oversize ? (
          <span className="break-all text-primary">{file.path}</span>
        ) : (
          <button
            type="button"
            onClick={() => void toggle()}
            className="cursor-pointer break-all border-none bg-transparent p-0 text-left text-primary underline-offset-2 transition-colors hover:text-display hover:underline"
          >
            {file.path}
          </button>
        )}
        <span className="shrink-0 text-[10px] tracking-[0.06em] text-disabled">{fmtBytes(file.size)}</span>
        {file.oversize && (
          <span className="shrink-0 text-[10px] tracking-[0.06em] text-secondary">too large · metadata only</span>
        )}
        {downloadable && <span className="shrink-0 text-[10px] tracking-[0.06em] text-secondary">download</span>}
        <span className="ml-auto shrink-0 text-[10px] tracking-[0.06em] text-disabled">{fmt(file.updatedAt)}</span>
      </div>
      {loaded && (
        <div className="mt-1.5">
          {'loading' in loaded ? (
            <div className="font-mono text-[11px] tracking-[0.08em] text-secondary">[ Loading ]</div>
          ) : 'text' in loaded ? (
            <pre className="m-0 max-h-[360px] overflow-auto whitespace-pre-wrap rounded-md border border-hairline bg-raised px-4 py-3 text-[12px] leading-relaxed text-secondary">
              {loaded.text || '(empty file)'}
            </pre>
          ) : 'error' in loaded ? (
            <div className="font-mono text-[12px] text-accent">[ ERROR ] {loaded.error}</div>
          ) : (
            <div className="text-[12px] text-disabled">(binary — use the download link)</div>
          )}
        </div>
      )}
    </li>
  )
}

/** A recorded artifact whose blob is no longer synced — non-clickable, with a
 *  subtle hint rather than a dead link. */
export function UnavailableFileRow({ path }: { path: string }) {
  return (
    <li className="font-mono text-[12.5px]">
      <div className="flex items-baseline gap-2">
        <span className="break-all text-disabled">{path}</span>
        <span className="shrink-0 text-[10px] tracking-[0.06em] text-disabled">not available</span>
      </div>
    </li>
  )
}
