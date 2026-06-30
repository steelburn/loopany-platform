import { useCallback, useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import type { ArtifactSummary, JobDetail, RunDiffFile, RunDiffResult, RunSummary, TranscriptResult } from '../types'
import { dur, fmt, formatTranscript, humanBytes } from '../lib/format'
import { cancelRun, getArtifacts, getJobDetail, getRunDiff, getTranscript, loadOlderRuns } from '../server/loopApi'
import { ArtifactFileRow, UnavailableFileRow } from './ArtifactFileRow'
import { ModalSection } from './Modal'
import { btn, btnDanger, Pre, StatusPill } from './ui'

function Row({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <tr className="border-b border-hairline">
      <td className="w-[84px] py-2 pr-3 align-top font-mono text-[11px] tracking-[0.06em] text-secondary">
        {k}
      </td>
      <td className="py-2 align-top">{children}</td>
    </tr>
  )
}

function Fold({ title, sub, body }: { title: string; sub?: string; body: string }) {
  return (
    <details className="my-2 overflow-hidden rounded-md border border-hairline bg-surface">
      <summary className="cursor-pointer select-none px-3.5 py-2.5 font-mono text-[12px] tracking-[0.04em] text-primary marker:content-['']">
        {title}
        {sub && <span className="normal-case tracking-normal text-secondary"> {sub}</span>}
      </summary>
      <pre className="m-0 max-h-[360px] overflow-auto whitespace-pre-wrap border-t border-hairline bg-raised px-4 py-3.5 font-mono text-[12.5px] leading-relaxed text-secondary">
        {body}
      </pre>
    </details>
  )
}

/** Signed byte delta — "+1.8 KB", "−240 B", "" when unknown. */
function fmtDelta(n: number | null): string {
  if (n == null || n === 0) return ''
  return `${n > 0 ? '+' : '−'}${humanBytes(n)}`
}

/** Historical fallback for a run with no snapshot (predates Phase 3): the run's
 *  recorded produced-file list, reusing the Phase 2 file viewer. Files still
 *  synced to the loop expand/download inline; ones with no synced blob render
 *  non-clickable with a subtle hint instead of a dead link. */
function RecordedFiles({ run }: { run: RunSummary }) {
  const artifacts = run.artifacts ?? []
  const [live, setLive] = useState<ArtifactSummary[] | null>(null)
  useEffect(() => {
    let alive = true
    getArtifacts({ data: { loopId: run.loopId } })
      .then((d) => alive && setLive(d))
      .catch(() => alive && setLive([]))
    return () => {
      alive = false
    }
  }, [run.loopId])

  const byPath = new Map((live ?? []).map((f) => [f.path, f]))
  return (
    <>
      <ModalSection>Files ({artifacts.length})</ModalSection>
      {live == null ? (
        <div className="font-mono text-[12px] tracking-[0.08em] text-secondary">[ Loading ]</div>
      ) : (
        <ul className="space-y-1">
          {artifacts.map((a) => {
            const f = byPath.get(a.path)
            return f ? (
              <ArtifactFileRow key={a.path} loopId={run.loopId} file={f} />
            ) : (
              <UnavailableFileRow key={a.path} path={a.path} />
            )
          })}
        </ul>
      )}
    </>
  )
}

const STATUS_LABEL: Record<RunDiffFile['status'], string> = { added: 'added', modified: 'changed', removed: 'removed' }
const STATUS_CLS: Record<RunDiffFile['status'], string> = {
  added: 'text-success',
  modified: 'text-secondary',
  removed: 'text-accent',
}

/** Per-run artifact diff vs the previous run (Phase 3). Lazy by runId; the server
 *  computes a real unified text diff for text files and a size-delta marker for
 *  binary/oversize. Degrades to a calm fallback for runs with no snapshot. */
function Changes({ run }: { run: RunSummary }) {
  const [data, setData] = useState<RunDiffResult | null>(null)
  useEffect(() => {
    if (run.running) return // snapshot is captured at finalize — nothing to diff yet
    let alive = true
    getRunDiff({ data: { runId: run.id } })
      .then((d) => alive && setData(d))
      .catch(() => alive && setData({ hasSnapshot: false, files: [] }))
    return () => {
      alive = false
    }
  }, [run.id, run.running])

  if (run.running)
    return (
      <>
        <ModalSection>Changes</ModalSection>
        <div className="text-[13px] text-disabled">(file changes appear once the run finishes)</div>
      </>
    )
  if (!data)
    return (
      <>
        <ModalSection>Changes</ModalSection>
        <div className="font-mono text-[12px] tracking-[0.08em] text-secondary">[ Loading ]</div>
      </>
    )
  if (!data.hasSnapshot) {
    // Runs predating Phase 3 have no diff snapshot — fall back to the run's
    // recorded produced-file list so the file surface isn't lost.
    if ((run.artifacts?.length ?? 0) > 0) return <RecordedFiles run={run} />
    return (
      <>
        <ModalSection>Changes</ModalSection>
        <div className="text-[13px] text-disabled">
          No recorded file changes for this run (an earlier run); runs from now on track what changed.
        </div>
      </>
    )
  }
  return (
    <>
      <ModalSection>Changes ({data.files.length})</ModalSection>
      {data.files.length === 0 ? (
        <div className="text-[13px] text-disabled">(no files changed since the previous run)</div>
      ) : (
        <div className="space-y-1">
          {data.files.map((f) => {
            const head = (
              <span className="flex items-baseline gap-2 font-mono text-[12.5px]">
                <span className={`shrink-0 text-[10px] tracking-[0.06em] ${STATUS_CLS[f.status]}`}>{STATUS_LABEL[f.status]}</span>
                <span className="break-all text-primary">{f.path}</span>
                {fmtDelta(f.sizeDelta) && <span className="shrink-0 text-[10px] tracking-[0.06em] text-disabled">{fmtDelta(f.sizeDelta)}</span>}
                {f.binary && <span className="shrink-0 text-[10px] tracking-[0.06em] text-secondary">binary</span>}
                {f.tooLarge && <span className="shrink-0 text-[10px] tracking-[0.06em] text-secondary">too large to diff</span>}
              </span>
            )
            // Text files expand their unified diff; binary/oversize show the line only.
            return f.diff ? (
              <details key={f.path} className="overflow-hidden rounded-md border border-hairline bg-surface">
                <summary className="cursor-pointer select-none px-3.5 py-2 marker:content-['']">{head}</summary>
                <pre className="m-0 max-h-[360px] overflow-auto whitespace-pre-wrap border-t border-hairline bg-raised px-4 py-3.5 font-mono text-[12px] leading-relaxed text-secondary">
                  {f.diff}
                </pre>
              </details>
            ) : (
              <div key={f.path} className="px-3.5 py-2">
                {head}
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}

function Transcript({ runId, running }: { runId: string; running?: boolean }) {
  const [data, setData] = useState<TranscriptResult | null>(null)
  // Keyed on `running` too: a run opened mid-flight has only a partial trace (or
  // none yet), so refetch once it settles to pull the complete transcript.
  useEffect(() => {
    let alive = true
    getTranscript({ data: { runId } })
      .then((d) => alive && setData(d))
      .catch((e) => alive && setData({ error: String(e) }))
    return () => {
      alive = false
    }
  }, [runId, running])

  if (!data)
    return <div className="font-mono text-[12px] tracking-[0.08em] text-secondary">[ Loading ]</div>
  if ('error' in data) return <div className="font-mono text-[13px] text-accent">[ ERROR ] {data.error}</div>
  return (
    <div>
      {data.system && <Fold title="▸ system prompt" sub="standing instructions · current version" body={data.system} />}
      {data.query && <Fold title="▸ user query" sub="actual payload sent · expand" body={data.query} />}
      {!data.steps.length ? (
        <div className="mt-2.5 text-[13px] text-disabled">(no execution trace)</div>
      ) : (
        <Pre>{formatTranscript(data.steps)}</Pre>
      )}
    </div>
  )
}

// The coding agent's session id behind this run — handy for resuming that session
// in your agent (e.g. `claude --resume <id>`) or feeding the auto-evolve context.
// Mono + click-to-copy.
function SessionId({ id }: { id: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard?.writeText(id)
        setCopied(true)
        setTimeout(() => setCopied(false), 1200)
      }}
      title="Copy session id"
      className="inline-flex max-w-full cursor-pointer items-center gap-1.5 border-none bg-transparent p-0 text-left font-mono text-[12px] text-secondary transition-colors hover:text-display"
    >
      <span className="truncate">{id}</span>
      <span aria-hidden className="shrink-0 text-[10px] tracking-[0.08em] text-disabled">
        {copied ? '✓ copied' : 'copy'}
      </span>
    </button>
  )
}

/** How many older pages to walk back looking for a run not in the latest set
 *  (cursor paging via loadOlderRuns) before giving up — a safety bound so a bad
 *  runId can't page the whole history. 64 × 100/page covers very deep histories. */
const MAX_OLDER_PAGES = 64

/**
 * Run detail PAGE body — its own route (`/loops/$loopId/runs/$runId`). Resolves
 * the run by id from the loop's detail payload (reusing getJobDetail, no new
 * backend); a run older than that latest window is located by paging backward
 * with the existing `loadOlderRuns` cursor fn (still no new backend), so a run
 * clickable in the timeline strip never dead-ends. Self-polls while it's in
 * flight, and renders the run's report, the per-run diff (Phase 3 "Changes"),
 * and the execution transcript. The route supplies the back/return chrome.
 */
export function RunDetailView({ loopId, runId }: { loopId: string; runId: string }) {
  const [detail, setDetail] = useState<JobDetail | null>(null)
  const [olderRun, setOlderRun] = useState<RunSummary | null>(null) // located via backward paging
  const [searchDone, setSearchDone] = useState(false) // backward search settled (found or exhausted)
  const [err, setErr] = useState<string | null>(null)

  // Initial load — surfaces a fatal error if the loop itself can't be read.
  const load = useCallback(async () => {
    try {
      setDetail(await getJobDetail({ data: loopId }))
      setErr(null) // clear a prior transient error on success
    } catch (e) {
      setErr(String(e))
    }
  }, [loopId])

  // Silent background refresh (the live-run poll) — a transient failure keeps the
  // stale data on screen rather than bricking the page on the `if (err)` guard.
  const poll = useCallback(async () => {
    try {
      setDetail(await getJobDetail({ data: loopId }))
    } catch {
      /* keep what we have; the next tick retries */
    }
  }, [loopId])

  useEffect(() => {
    setDetail(null)
    setOlderRun(null)
    setSearchDone(false)
    setErr(null)
    void load()
  }, [loopId, runId, load])

  const run = detail?.runs.find((r) => r.id === runId) ?? olderRun

  // Not in the latest window → walk older pages by cursor until we find it or run
  // out (try/finally so searchDone always settles, even on a transient failure —
  // otherwise the page would hang on the loading guard).
  useEffect(() => {
    if (!detail || run || searchDone) return
    let alive = true
    void (async () => {
      try {
        let cursor = detail.runs.length ? detail.runs[detail.runs.length - 1]!.ts : new Date().toISOString()
        for (let i = 0; i < MAX_OLDER_PAGES && alive; i++) {
          const page = await loadOlderRuns({ data: { loopId, beforeTs: cursor, limit: 100 } })
          if (!page.length) break
          const hit = page.find((r) => r.id === runId)
          if (hit) {
            if (alive) setOlderRun(hit)
            return
          }
          cursor = page[0]!.ts // loadOlderRuns returns oldest-first; page back from the oldest
        }
      } finally {
        if (alive) setSearchDone(true)
      }
    })()
    return () => {
      alive = false
    }
  }, [detail, run, searchDone, loopId, runId])

  // Keep a live run streaming in (its transcript + diff settle once it finishes).
  const running = !!run?.running
  useEffect(() => {
    if (!running) return
    const t = setInterval(() => void poll(), 3_000)
    return () => clearInterval(t)
  }, [running, poll])

  async function onStop() {
    if (!run) return
    if (!confirm('Stop this run? It will be marked canceled.')) return
    const r = await cancelRun({ data: run.id })
    if (r?.error) {
      alert(`Stop failed: ${r.error}`)
      return
    }
    await load()
  }

  if (err) return <div className="font-mono text-[13px] text-accent">[ ERROR ] {err}</div>
  // Still loading while the loop detail is in flight, or while the backward
  // search for an older run hasn't settled yet.
  if (!detail || (!run && !searchDone))
    return <div className="font-mono text-[12px] tracking-[0.08em] text-secondary">[ Loading ]</div>
  if (!run)
    return (
      <div className="rounded-xl border border-wire bg-surface px-6 py-10 text-center">
        <div className="text-[14px] text-secondary">This run is no longer available.</div>
        <Link
          to="/loops/$loopId"
          params={{ loopId }}
          className="mt-3 inline-block font-mono text-[12px] tracking-[0.08em] text-interactive underline underline-offset-2 hover:text-display"
        >
          ← back to the loop
        </Link>
      </div>
    )

  const jobName = detail.summary.name
  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-medium tracking-tight text-display">Run · {jobName}</h1>
          <div className="mt-1.5 font-mono text-[12px] tracking-[0.02em] text-secondary">{fmt(run.ts)}</div>
        </div>
        <StatusPill run={run} colorText />
      </div>
      <table className="mt-5 w-full text-[13px]">
        <tbody>
          {run.status && <Row k="Status">{run.status}</Row>}
          {run.durationMs != null && <Row k="Duration">{dur(run.durationMs)}</Row>}
          {run.sample != null && <Row k="sample">{String(run.sample)}</Row>}
          {run.state != null && (
            <Row k="state">
              <code className="font-mono">{JSON.stringify(run.state)}</code>
            </Row>
          )}
          {run.error && (
            <Row k="Error">
              <span style={{ color: 'var(--color-run-error)' }}>{run.error}</span>
            </Row>
          )}
          {run.sessionId && (
            <Row k="Session">
              <SessionId id={run.sessionId} />
            </Row>
          )}
        </tbody>
      </table>

      {run.message && (
        <>
          <ModalSection>Report</ModalSection>
          <Pre>{run.message}</Pre>
        </>
      )}
      <Changes run={run} />
      {run.control && run.control.length > 0 && (
        <>
          <ModalSection>Control actions</ModalSection>
          <Pre>
            {run.control
              .map(
                (c) =>
                  `${c.command} ${JSON.stringify(c.args)} → ${c.result}${c.detail ? ` (${c.detail})` : ''}`,
              )
              .join('\n')}
          </Pre>
        </>
      )}

      <ModalSection>Execution</ModalSection>
      {run.sessionId ? (
        <Transcript runId={run.id} running={run.running} />
      ) : (
        <div className="text-[13px] text-disabled">
          This run has no recorded session (an earlier run); runs from now on include the execution trace.
        </div>
      )}

      <div className="mt-[18px] flex flex-wrap gap-2.5">
        <Link to="/loops/$loopId" params={{ loopId }} className={btn}>
          View the whole loop →
        </Link>
        {run.running && (
          <button type="button" onClick={onStop} className={btnDanger}>
            Stop run
          </button>
        )}
      </div>
    </>
  )
}
