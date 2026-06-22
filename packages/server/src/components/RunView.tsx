import { useEffect, useState } from 'react'
import type { RunSummary, TranscriptResult } from '../types'
import { dur, fmt, formatTranscript } from '../lib/format'
import { cancelRun, getTranscript } from '../server/loopApi'
import { ModalHead, ModalSection } from './Modal'
import { ArtifactList, btn, btnDanger, Pre, StatusPill } from './ui'

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

function Transcript({ runId }: { runId: string }) {
  const [data, setData] = useState<TranscriptResult | null>(null)
  useEffect(() => {
    let alive = true
    getTranscript({ data: { runId } })
      .then((d) => alive && setData(d))
      .catch((e) => alive && setData({ error: String(e) }))
    return () => {
      alive = false
    }
  }, [runId])

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

// The claude-code session id behind this run — handy for `claude --resume <id>`
// or feeding the auto-evolve context. Mono + click-to-copy.
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

export function RunView({
  jobName,
  run,
  onOpenLoop,
  onChanged,
  onClose,
}: {
  jobName: string
  run: RunSummary
  onOpenLoop: () => void
  onChanged: () => void
  onClose: () => void
}) {
  async function onStop() {
    if (!confirm('Stop this run? It will be marked canceled.')) return
    const r = await cancelRun({ data: run.id })
    if (r?.error) {
      alert(`Stop failed: ${r.error}`)
      return
    }
    onChanged()
    onClose()
  }
  return (
    <>
      <ModalHead title={`One run · ${jobName}`} sub={fmt(run.ts)} />
      <table className="mt-3.5 w-full text-[13px]">
        <tbody>
          <Row k="Outcome">
            <StatusPill run={run} />
          </Row>
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
      {run.artifacts && run.artifacts.length > 0 && (
        <>
          <ModalSection>Artifacts ({run.artifacts.length})</ModalSection>
          <ArtifactList artifacts={run.artifacts} />
        </>
      )}
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
        <Transcript runId={run.id} />
      ) : (
        <div className="text-[13px] text-disabled">
          This run has no recorded session (an earlier run); runs from now on include the execution trace.
        </div>
      )}

      <div className="mt-[18px] flex flex-wrap gap-2.5">
        <button type="button" onClick={onOpenLoop} className={btn}>
          View the whole loop →
        </button>
        {run.running && (
          <button type="button" onClick={onStop} className={btnDanger}>
            Stop run
          </button>
        )}
      </div>
    </>
  )
}
