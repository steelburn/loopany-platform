// @vitest-environment jsdom
import DOMPurify from 'dompurify'
import { describe, expect, it } from 'vitest'
import { renderMarkdown } from './markdown'

describe('renderMarkdown', () => {
  it('renders inline markdown (bold / code / links / lists)', () => {
    const html = renderMarkdown('**bold** and `code` and [link](https://x.test)\n\n- one\n- two')
    expect(html).toContain('<strong>bold</strong>')
    expect(html).toContain('<code>code</code>')
    expect(html).toContain('href="https://x.test"')
    expect(html).toContain('<li>one</li>')
  })

  it('strips scripts and event handlers (allowlist sanitizer)', () => {
    const html = renderMarkdown('<img src=x onerror="alert(1)"> <script>alert(2)</script> [x](javascript:alert(3))')
    expect(html).not.toContain('<script')
    expect(html).not.toContain('onerror')
    expect(html.toLowerCase()).not.toContain('javascript:')
  })

  it('new-tabs external http(s) links, leaves relative artifact links untouched', () => {
    const html = renderMarkdown('[ext](https://x.test/y) and [file](tickets/SUP-71.md)')
    expect(html).toMatch(/<a[^>]*href="https:\/\/x\.test\/y"[^>]*/)
    const ext = html.match(/<a[^>]*href="https:\/\/x\.test\/y"[^>]*>/)?.[0] ?? ''
    expect(ext).toContain('target="_blank"')
    expect(ext).toContain('rel="noopener noreferrer"')
    const rel = html.match(/<a[^>]*href="tickets\/SUP-71\.md"[^>]*>/)?.[0] ?? ''
    expect(rel).toBeTruthy()
    expect(rel).not.toContain('target=') // relative links stay in-app (the Files panel intercepts)
  })

  it('the external-anchor hook does not leak into later sanitize calls', () => {
    renderMarkdown('[ext](https://x.test/y)')
    // a bare DOMPurify user after renderMarkdown must not inherit the hook
    const out = DOMPurify.sanitize('<a href="https://x.test/z">z</a>')
    expect(out).not.toContain('target="_blank"')
  })
})
