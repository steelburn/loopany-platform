import { useMemo } from 'react'
import DOMPurify, { type Config } from 'dompurify'
import parse, { Element, type HTMLReactParserOptions } from 'html-react-parser'
import type { RunSummary } from '../types'
import { buildBindingContext, parseSeries, resolveBindings } from '../lib/binding'
import { numericSeries } from '../lib/stats'
import { LoopChart } from './LoopChart'
import { LoopSparkline } from './LoopSparkline'

/**
 * Renders a loop's generative-UI template (agent-authored HTML on `Job.ui`).
 *
 * Pipeline: interpolate `{{ ... }}` scalar bindings with live run data → DOMPurify
 * sanitize (allowlisted HTML subset; NO script/handlers/raw-svg) → parse to React,
 * swapping the two irreducible data primitives for their renderers. Everything
 * else (A/B panels, stat tiles, layout, text) is the agent's own HTML — there are
 * NO opinionated panel components.
 *
 *   <loop-chart series="mrr:MRR:$, paid:Paid"></loop-chart>   multi-series line chart
 *   <loop-sparkline key="mrr"></loop-sparkline>                inline sparkline
 */

const LOOP_TAGS = ['loop-chart', 'loop-sparkline']

const SANITIZE_CONFIG: Config = {
  ALLOWED_TAGS: [
    'h1', 'h2', 'h3', 'h4', 'h5', 'p', 'b', 'strong', 'i', 'em', 'u', 's', 'span', 'div',
    'ul', 'ol', 'li', 'table', 'thead', 'tbody', 'tr', 'td', 'th', 'code', 'pre', 'br',
    'hr', 'small', 'section', 'header', 'footer', 'a', 'figure', 'figcaption', 'mark',
    ...LOOP_TAGS,
  ],
  ALLOWED_ATTR: ['style', 'class', 'href', 'title', 'target', 'rel', 'series', 'key'],
  ADD_TAGS: LOOP_TAGS,
  CUSTOM_ELEMENT_HANDLING: {
    tagNameCheck: /^loop-(chart|sparkline)$/,
    attributeNameCheck: /^(series|key)$/,
    allowCustomizedBuiltInElements: false,
  },
}

// `series="cpu:CPU:℃, inlet:进风口:℃"` carries colons/commas/unicode that DOMPurify
// otherwise strips from the attribute value (leaving an empty <loop-chart> that renders
// nothing). These attrs hold only data we parse ourselves — no markup — so force-keep
// them on loop-* elements. Registered once at module load.
DOMPurify.addHook('uponSanitizeAttribute', (node, data) => {
  const tag = node.nodeName?.toLowerCase()
  if ((tag === 'loop-chart' || tag === 'loop-sparkline') && (data.attrName === 'series' || data.attrName === 'key')) {
    data.forceKeepAttr = true
  }
})

export function LoopView({ html, runs }: { html: string; runs: RunSummary[] }) {
  const clean = useMemo(() => {
    const ctx = buildBindingContext(runs)
    return DOMPurify.sanitize(resolveBindings(html, ctx), SANITIZE_CONFIG)
  }, [html, runs])

  // One numeric-series pass shared by every loop-chart/loop-sparkline in the template.
  const data = useMemo(() => numericSeries(runs), [runs])

  const options: HTMLReactParserOptions = useMemo(
    () => ({
      replace: (node) => {
        if (!(node instanceof Element)) return undefined
        const a = node.attribs ?? {}
        if (node.name === 'loop-chart') return <LoopChart data={data} series={parseSeries(a.series)} />
        if (node.name === 'loop-sparkline') return <LoopSparkline series={data} field={a.key} />
        return undefined
      },
    }),
    [data],
  )

  return <div className="loopview space-y-2 text-[14px] leading-relaxed">{parse(clean, options)}</div>
}
