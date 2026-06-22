import { describe, expect, it } from 'vitest'
import { numericSeries } from './stats'
import type { RunSummary } from '../types'

const run = (ts: string, state: RunSummary['state']): RunSummary => ({
  id: `run-${ts}`,
  ts,
  outcome: 'exec',
  status: 'nothing-new',
  message: null,
  durationMs: null,
  error: null,
  sample: null,
  state,
  control: null,
  sessionId: null,
  artifacts: null,
})

describe('numericSeries', () => {
  it('builds one chronological series per numeric field (newest-first input)', () => {
    const series = numericSeries([
      run('2026-06-17T00:00:00Z', { mrr: 9200 }),
      run('2026-06-16T00:00:00Z', { mrr: 9300 }),
    ])
    expect(series.mrr).toEqual([
      { t: '2026-06-16T00:00:00Z', v: 9300 },
      { t: '2026-06-17T00:00:00Z', v: 9200 },
    ])
  })
})
