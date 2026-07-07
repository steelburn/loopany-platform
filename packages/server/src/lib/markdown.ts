import DOMPurify, { type Config } from 'dompurify'
import { marked } from 'marked'

/**
 * Shared markdown → sanitized HTML pipeline: marked (GFM) → DOMPurify (an
 * allowlisted prose subset, NO script/handlers). ONE sanitizer config for every
 * markdown surface (the Files viewer's `TaskFileView`, the run-detail Execution
 * transcript) so the allowlist can't drift between them. Render the output under
 * the `.taskmd` styles.
 */
export const MD_SANITIZE: Config = {
  ALLOWED_TAGS: [
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'br', 'hr', 'strong', 'b', 'em', 'i',
    'del', 's', 'code', 'pre', 'blockquote', 'ul', 'ol', 'li', 'a', 'span',
    'table', 'thead', 'tbody', 'tr', 'th', 'td', 'img',
  ],
  ALLOWED_ATTR: ['href', 'title', 'target', 'rel', 'src', 'alt'],
}

/** Scoped per-call hook: external http(s) anchors open in a new tab (with the
 *  opener severed) so a click never navigates away from the dashboard. Relative
 *  hrefs are left untouched — the Files viewer intercepts those on click and
 *  opens the referenced artifact in place (see lib/artifactLinks.ts). */
function newTabExternalAnchors(node: Element): void {
  if (node.tagName !== 'A') return
  const href = node.getAttribute('href') ?? ''
  if (/^https?:\/\//i.test(href) || href.startsWith('//')) {
    node.setAttribute('target', '_blank')
    node.setAttribute('rel', 'noopener noreferrer')
  }
}

/** Markdown string → sanitized HTML string (safe for dangerouslySetInnerHTML). */
export function renderMarkdown(content: string): string {
  // add/remove around the call so the hook never leaks into other sanitizer
  // users (the dashboard's LoopView registers its own, differently-named hook).
  DOMPurify.addHook('afterSanitizeAttributes', newTabExternalAnchors)
  try {
    return DOMPurify.sanitize(marked.parse(content, { async: false, gfm: true }) as string, MD_SANITIZE)
  } finally {
    DOMPurify.removeHook('afterSanitizeAttributes')
  }
}
