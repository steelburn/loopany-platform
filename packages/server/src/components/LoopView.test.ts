// @vitest-environment jsdom
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect } from 'vitest'
import { LoopView } from './LoopView'
import type { RunSummary } from '../types'

// Exact production template + runs for loop-mqm5j7q4-0415991c
const HTML =
  '<div><h3>🌡️ homelab iLO 温度</h3>' +
  '<div>CPU {{latest.cpu}}℃ 进风口 {{latest.inlet}}℃</div>' +
  '<loop-chart series="cpu:CPU:℃, inlet:进风口:℃" window="24" points="24" range="24h"></loop-chart>' +
  '</div>'

const mk = (ts: string, state: Record<string, number> | null): RunSummary =>
  ({ id: 'r-' + ts, ts, outcome: 'new', status: null, message: null, state }) as unknown as RunSummary

// Detail order = newest-first
const RUNS: RunSummary[] = [
  mk('2026-06-20T13:30:12.514Z', null),
  mk('2026-06-20T13:00:02.108Z', { cpu: 40, inlet: 31 }),
  mk('2026-06-20T12:00:01.146Z', { cpu: 40, inlet: 31 }),
  mk('2026-06-20T11:05:18.210Z', null),
  mk('2026-06-20T11:00:01.850Z', { cpu: 40, inlet: 30 }),
]

describe('LoopView <loop-chart>', () => {
  it('renders a multi-series svg chart from the real template + runs', () => {
    const out = renderToStaticMarkup(createElement(LoopView, { html: HTML, runs: RUNS }))
    // Regression: DOMPurify used to strip the colon/comma-laden `series` value,
    // leaving an empty <loop-chart> that rendered nothing.
    expect(out).toContain('<svg')
    expect(out.match(/<path/g)).toHaveLength(2) // one line per series
    expect(out).toContain('进风口') // legend label survived sanitize
    expect(out).toContain('40℃') // {{latest.cpu}} binding resolved
  })
})
