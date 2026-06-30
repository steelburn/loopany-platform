import { useCallback, useEffect, useRef, useState } from 'react'
import type { ArtifactSummary } from '../types'
import { getArtifacts } from '../server/loopApi'
import { ArtifactFileRow } from './ArtifactFileRow'
import { ModalSection } from './Modal'

/**
 * The "Files" section of the loop detail — the loop's CURRENT live-synced files
 * (Phase 2). The list is fetched lazily by loopId (like getTranscript) so the
 * detail payload stays small; clicking a text file pulls its content inline,
 * a binary/oversize file is a download link. Self-polls while open so files
 * appear as the loop writes them (faster while a run is live).
 */
export function FilesView({ loopId, running }: { loopId: string; running?: boolean }) {
  const [files, setFiles] = useState<ArtifactSummary[] | null>(null)
  const seq = useRef(0) // guards against a stale list overwriting a fresh one

  const refresh = useCallback(async () => {
    const mine = ++seq.current
    try {
      const list = await getArtifacts({ data: { loopId } })
      if (mine === seq.current) setFiles(list)
    } catch {
      if (mine === seq.current) setFiles((prev) => prev ?? [])
    }
  }, [loopId])

  // Reset + fetch on loop change.
  useEffect(() => {
    setFiles(null)
    void refresh()
  }, [loopId, refresh])

  // Keep the list live as the loop writes files — quick while running, calm otherwise.
  useEffect(() => {
    const t = setInterval(() => void refresh(), running ? 4_000 : 12_000)
    return () => clearInterval(t)
  }, [running, refresh])

  return (
    <>
      <ModalSection>files{files ? ` (${files.length})` : ''}</ModalSection>
      {files == null ? (
        <div className="font-mono text-[12px] tracking-[0.08em] text-secondary">[ Loading ]</div>
      ) : files.length === 0 ? (
        <div className="text-[13px] text-disabled">(no files synced yet — syncs as the loop writes files)</div>
      ) : (
        <ul className="space-y-1">
          {files.map((f) => (
            <ArtifactFileRow key={f.path} loopId={loopId} file={f} />
          ))}
        </ul>
      )}
    </>
  )
}
