// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025-2026 lin-snow

import { describe, expect, it } from 'vitest'
import { renderMarkdown } from '../../src/editor/core/markdown'

function lines(count: number): string {
  return Array.from({ length: count }, (_, i) => `line_${i + 1}`).join('\n')
}

describe('renderMarkdown renderer behaviors', () => {
  it('为外链添加 target 与 rel 属性', async () => {
    const html = await renderMarkdown('[echo](https://example.com)')

    expect(html).toContain('target="_blank"')
    expect(html).toContain('rel="noopener noreferrer"')
  })

  it('仅折叠超过阈值的代码块并替换按钮文案', async () => {
    const source = ['```ts', lines(18), '```'].join('\n')
    const html = await renderMarkdown(source, {
      expandLabel: '展开<更多>',
      collapseLabel: '收起<更少>',
    })

    expect(html).toContain('code-block--collapsible')
    expect(html).toContain('code-block-toggle')
    expect(html).toContain('展开&lt;更多&gt;')
    expect(html).toContain('收起&lt;更少&gt;')
  })

  it('渲染卡片中常用的 Markdown 语法，包括水平分割线', async () => {
    const source = [
      '# Title',
      '',
      'A **bold** and *italic* [link](https://example.com) with `inline code`.',
      '',
      '- first item',
      '- second item',
      '',
      '> quote',
      '',
      '---',
      '',
      '```ts',
      'const answer = 42',
      '```',
    ].join('\n')
    const html = await renderMarkdown(source)

    expect(html).toContain('<h1>Title</h1>')
    expect(html).toContain('<strong>bold</strong>')
    expect(html).toContain('<em>italic</em>')
    expect(html).toContain('<a href="https://example.com"')
    expect(html).toContain('<code>inline code</code>')
    expect(html).toContain('<ul>')
    expect(html).toContain('<blockquote>')
    expect(html).toContain('<hr>')
    expect(html).toContain('code-block')
  })

  it('将 Markdown 图片渲染为可访问的响应式图片链接', async () => {
    const html = await renderMarkdown('![preview](https://cdn.example.com/image.jpg)')

    expect(html).toContain('class="markdown-image-link"')
    expect(html).toContain('href="https://cdn.example.com/image.jpg"')
    expect(html).toContain('target="_blank"')
    expect(html).toContain('rel="noopener noreferrer"')
    expect(html).toContain('class="markdown-image"')
    expect(html).toContain('loading="lazy"')
    expect(html).toContain('decoding="async"')
  })

  it('对原始 HTML 输入保持转义，避免脚本注入', async () => {
    const html = await renderMarkdown('<script>alert("xss")</script>')

    expect(html).toContain('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;')
    expect(html).not.toContain('<script>')
  })

  it('缓存按内容与标签区分，避免错误复用本地化文案', async () => {
    const source = ['```ts', lines(18), '```'].join('\n')
    const htmlA = await renderMarkdown(source, { expandLabel: '展开A', collapseLabel: '收起A' })
    const htmlB = await renderMarkdown(source, { expandLabel: '展开B', collapseLabel: '收起B' })

    expect(htmlA).toContain('展开A')
    expect(htmlA).not.toContain('展开B')
    expect(htmlB).toContain('展开B')
    expect(htmlB).not.toContain('展开A')
  })
})
