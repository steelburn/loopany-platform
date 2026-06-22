import type { StateField } from '../types'
import { bounds, svgLine, type SeriesPoint } from '../lib/stats'
import { fnum } from '../lib/format'

/** Distinct strokes for multiple series — display ink first, then the signal colors. */
const STROKES = [
  'var(--color-display)',
  'var(--color-interactive)',
  'var(--color-success)',
  'var(--color-accent)',
]

const W = 320,
  H = 120,
  PAD = 4

/**
 * `<loop-chart series="mrr:MRR:$, paid:Paid">` — multi-series line chart over the
 * loop's run history. Each `series` entry binds one numeric state key; missing keys
 * are skipped. `data` is the shared `numericSeries(runs)` map computed once by LoopView.
 */
export function LoopChart({
  data,
  series,
}: {
  data: Record<string, SeriesPoint[]>
  series: StateField[]
}) {
  if (!series.length) return null
  const plotted = series
    .map((f) => ({ field: f, pts: data[f.key] ?? [] }))
    .filter((s) => s.pts.length >= 2)
  if (!plotted.length) return null

  // Shared scale so series are comparable on one canvas.
  const { lo, hi } = bounds(plotted.flatMap((s) => s.pts.map((p) => p.v)))
  const len = Math.max(...plotted.map((s) => s.pts.length))

  return (
    <figure className="my-2">
      <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" style={{ height: 'auto' }}>
        {plotted.map((s, idx) => (
          <path
            key={s.field.key}
            d={svgLine(s.pts, { w: W, h: H, lo, hi, len, padX: PAD, padY: PAD })}
            fill="none"
            stroke={STROKES[idx % STROKES.length]}
            strokeWidth="1.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ))}
      </svg>
      <figcaption className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-[var(--color-secondary)]">
        {plotted.map((s, idx) => {
          const last = s.pts[s.pts.length - 1]
          if (!last) return null
          const unit = s.field.unit ?? ''
          return (
            <span key={s.field.key} className="inline-flex items-center gap-1.5">
              <span
                className="inline-block h-[2px] w-3 align-middle"
                style={{ background: STROKES[idx % STROKES.length] }}
              />
              {s.field.label ?? s.field.key}
              <span className="text-[var(--color-display)]">
                {unit === '$' ? `$${fnum(last.v)}` : `${fnum(last.v)}${unit}`}
              </span>
            </span>
          )
        })}
      </figcaption>
    </figure>
  )
}
