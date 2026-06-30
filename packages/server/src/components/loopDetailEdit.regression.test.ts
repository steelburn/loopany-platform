import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * Regression guard for the detail-page Edit error.
 *
 * `ModalHead` renders Base UI `Dialog.Title` / `Dialog.Close`, which call
 * `useDialogRootContext()` and throw ("Cannot destructure property 'store' of
 * 'useDialogRootContext(...)' as it is undefined.") when rendered outside a
 * `Dialog.Root`. The loop detail page (`LoopDetailView`) is a plain page — its
 * edit modes are in-page takeovers, NOT modals — so it must use the bare-page
 * `EditHead` heading, never `ModalHead`. Clicking Edit used to import + render
 * `ModalHead` here and crash the page on the first click.
 */
const src = readFileSync(fileURLToPath(new URL('./LoopDetailView.tsx', import.meta.url)), 'utf8')

describe('LoopDetailView edit-mode heading', () => {
  it('does not import or render the Dialog-based ModalHead on the bare page', () => {
    expect(src).not.toMatch(/<ModalHead\b/) // no JSX usage
    expect(src).not.toMatch(/import\s*\{[^}]*\bModalHead\b[^}]*\}\s*from\s*['"]\.\/Modal['"]/) // not imported
  })

  it('uses the bare-page EditHead heading for the edit modes', () => {
    expect(src).toMatch(/<EditHead\b/)
    expect(src).toMatch(/function EditHead\b/)
  })
})
