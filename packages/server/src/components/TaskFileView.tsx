import { useMemo } from 'react'
import DOMPurify, { type Config } from 'dompurify'
import { marked } from 'marked'

/**
 * Renders a loop's task file (`.md`) as a calm, formatted document instead of a
 * raw mono dump. Pipeline: marked (GFM) → DOMPurify (allowlisted prose subset, NO
 * script/handlers) → `.taskmd` styles. Capped to a fixed inset that scrolls
 * internally, so a long file can't blow the modal height — the run history below
 * stays reachable.
 */
const MD_SANITIZE: Config = {
  ALLOWED_TAGS: [
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'br', 'hr', 'strong', 'b', 'em', 'i',
    'del', 's', 'code', 'pre', 'blockquote', 'ul', 'ol', 'li', 'a', 'span',
    'table', 'thead', 'tbody', 'tr', 'th', 'td', 'img',
  ],
  ALLOWED_ATTR: ['href', 'title', 'target', 'rel', 'src', 'alt'],
}

export function TaskFileView({ content, fill, bare }: { content: string; fill?: boolean; bare?: boolean }) {
  const html = useMemo(
    () => DOMPurify.sanitize(marked.parse(content, { async: false, gfm: true }) as string, MD_SANITIZE),
    [content],
  )

  // `bare`: render just the formatted prose with no inset/cap of its own — the
  // host (e.g. the unified Files viewer) owns the surface, padding, and scroll.
  if (bare) {
    return <div className="taskmd px-5 py-4" dangerouslySetInnerHTML={{ __html: html }} />
  }

  // A faint inset (bg-raised — the system's surface for code/insets) sets the
  // document apart from the modal. Capped block by default; when `fill`, it
  // absolutely fills its (flex-1) wrapper at `lg` so it stretches to the column
  // height and scrolls — without its content inflating the layout.
  return (
    <div
      className={`taskmd max-h-[clamp(280px,44vh,520px)] overflow-y-auto overflow-x-hidden rounded-lg bg-raised px-4 py-3.5 ${fill ? 'lg:absolute lg:inset-0 lg:max-h-none' : ''}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
