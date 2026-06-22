import type { SeriesPoint } from '../lib/stats'
import { bounds, svgLine } from '../lib/stats'

/** `<loop-sparkline key="mrr">` — a tiny inline trend line for one metric. */
export function LoopSparkline({ series, field }: { series: Record<string, SeriesPoint[]>; field?: string }) {
  if (!field) return null
  const pts = series[field] ?? []
  if (pts.length < 2) return null
  const { lo, hi } = bounds(pts.map((p) => p.v))
  const d = svgLine(pts, { w: 120, h: 28, lo, hi, len: pts.length, padY: 2 })
  return (
    <svg viewBox="0 0 120 28" className="inline-block h-7 w-[120px] align-middle">
      <path d={d} fill="none" stroke="var(--color-display)" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  )
}
