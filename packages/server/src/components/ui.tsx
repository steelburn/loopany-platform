import type { ReactNode } from 'react'
import { useSyncExternalStore } from 'react'
import type { RunSummary } from '../types'
import { dotColor, dotLabel } from '../lib/format'

/*
 * Hydration gate. `fmt`/`rel`/`until` (lib/format) read the wall clock and the
 * runtime locale — toLocaleString() renders in the server's timezone (UTC) and
 * Date.now() differs between the SSR instant and the hydration instant, so any
 * time string baked into the server HTML mismatches the client and React warns.
 * Gate those renders behind this: server + first client paint both yield the
 * stable fallback (no mismatch), then the post-mount snapshot flips to true and
 * the real local/relative time renders. useSyncExternalStore needs no effect
 * and never subscribes (the value only flips once, at mount).
 */
const noopSubscribe = () => () => {}
export const useHydrated = (): boolean =>
  useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  )

/*
 * Shared control/field tokens (single source so they can't drift across forms/
 * modals). Nothing buttons: Space Mono, ALL CAPS, 0.08em tracking, pill radius,
 * flat (no shadow) — primary inverts to the display ink, secondary is a wire
 * outline, destructive is the red accent outline.
 */
const btnBase =
  'inline-flex cursor-pointer items-center gap-1.5 rounded-full px-4 py-2 font-mono text-[12px] tracking-[0.08em] transition-colors duration-200 disabled:cursor-default disabled:opacity-40'
export const btn = `${btnBase} border border-wire bg-transparent text-primary hover:border-display hover:text-display`
export const btnPrimary = `${btnBase} border border-display bg-display text-paper hover:opacity-80`
export const btnDanger = `${btnBase} border border-accent bg-transparent text-accent hover:bg-[color:var(--color-accent)]/10`
// The metered tier — actions that spend real credits (Run / Evolve). Heavier than
// the wire-outline secondary (full ink border, not gray) so cost reads as more
// consequential than a free toggle, but still flat/monochrome — no fill, no color.
// Sits visually between `btn` (free) and `btnPrimary` (the screen's lead verb).
export const btnCost = `${btnBase} border border-display bg-transparent text-display hover:bg-[color:var(--color-display)]/10`
// Compact control — its own padding/size base (NOT btnBase) so it can't lose the
// px/text tug-of-war on CSS source-order. For inline affordances like Copy that
// sit next to dense content rather than anchoring a dialog.
const btnSmBase =
  'inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-full border px-3 py-1 font-mono text-[11px] tracking-[0.06em] transition-colors duration-200 disabled:cursor-default disabled:opacity-40'
export const btnSm = `${btnSmBase} border-wire bg-transparent text-primary hover:border-display hover:text-display`

// Instrument "keys" — rectangular (rounded-md) flat buttons for the detail
// action bar. Squarer than the pill `btn` family so the two lead verbs (Run /
// Edit) read as panel keys, not consumer pills. (Metered/destructive verbs live
// in the "···" menu.) Primary fill + wire (free) outline.
const btnKeyBase =
  'inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-md px-3.5 py-2 font-mono text-[12px] tracking-[0.08em] transition-colors duration-200 disabled:cursor-default disabled:opacity-40'
export const btnKey = `${btnKeyBase} border border-wire bg-transparent text-primary hover:border-display hover:text-display`
export const btnKeyPrimary = `${btnKeyBase} border border-display bg-display text-paper hover:opacity-80`

/** Labels: Space Mono, ALL CAPS, instrument-panel style. */
export const labelCls =
  'mb-1.5 mt-3 block font-mono text-[11px] tracking-[0.08em] text-secondary'
export const inputCls =
  'w-full rounded-md border border-wire bg-surface px-3 py-2.5 text-sm text-primary outline-none transition-colors focus:border-display'
export const areaCls = `${inputCls} min-h-16 resize-y bg-raised font-mono text-[13px] leading-relaxed`
/** Field-sized <select>: the input token + the `.lp-select` caret/padding. */
export const selectCls = `${inputCls} lp-select cursor-pointer font-mono`

/**
 * The live "running" pulse — a display-ink fill breathing via the `runPulse`
 * keyframe (app.css). Shared so the in-flight timeline block and the Running
 * badge stay in lockstep. Spread into a `style` prop.
 */
/** Just the breathing animation — spread onto any element to pulse it in its own color. */
export const runPulseAnim = { animation: 'runPulse 1.1s ease-in-out infinite' } as const

export const runPulseStyle = {
  background: 'var(--color-display)',
  ...runPulseAnim,
} as const

/** The shared `[ ERROR ]` inline banner — mono tag + message + a dismiss link.
 *  One source so the four call sites (modals + detail view) stay in lockstep. */
export function ErrorBanner({
  message,
  onDismiss,
  className = 'mb-2',
}: {
  message: string
  onDismiss?: () => void
  className?: string
}) {
  return (
    <div className={`flex items-start gap-2 font-mono text-[12px] text-accent ${className}`}>
      <span className="shrink-0">[ ERROR ]</span>
      <span className="font-sans">{message}</span>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="ml-auto shrink-0 cursor-pointer border-none bg-transparent p-0 text-[11px] tracking-[0.08em] text-secondary transition-colors hover:text-display"
        >
          dismiss
        </button>
      )}
    </div>
  )
}

/** A read-only mono code block (task file / transcript / control dump). */
export function Pre({ children }: { children: ReactNode }) {
  return (
    <pre className="max-h-[300px] overflow-auto whitespace-pre-wrap rounded-md border border-hairline bg-raised px-4 py-3.5 font-mono text-[12.5px] leading-relaxed text-secondary">
      {children}
    </pre>
  )
}

/** A run's created/edited files — shared by the run detail + the edit-watch panel. */
export function ArtifactList({ artifacts }: { artifacts: NonNullable<RunSummary['artifacts']> }) {
  return (
    <ul className="space-y-1">
      {artifacts.map((a) => (
        <li key={a.path} className="flex items-baseline gap-2 font-mono text-[12.5px]">
          <span
            className={`shrink-0 text-[10px] tracking-[0.06em] ${a.kind === 'created' ? 'text-success' : 'text-secondary'}`}
          >
            {a.kind === 'created' ? 'new' : 'edit'}
          </span>
          <span className="break-all text-primary">{a.path}</span>
        </li>
      ))}
    </ul>
  )
}

/** A run's status as a colored dot + label. `colorText` also tints the label. */
export function StatusPill({ run, colorText }: { run: RunSummary; colorText?: boolean }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 font-medium"
      style={colorText ? { color: dotColor(run) } : undefined}
    >
      <span className="size-2 rounded-full" style={{ background: dotColor(run) }} />
      {dotLabel(run)}
    </span>
  )
}
