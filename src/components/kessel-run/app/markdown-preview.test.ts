import { expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MarkdownPreview } from './markdown-preview';

it('renders Markdown without executing supplied HTML, unsafe links or remote images', () => {
  const markup = renderToStaticMarkup(createElement(MarkdownPreview, { prose: '# Supplied heading\n\n**Strong text**\n\n<script>alert(1)</script>\n\n[Unsafe](javascript:alert(1))\n\n![remote](https://example.com/image.png)' }));
  expect(markup).toContain('<h1');
  expect(markup).toContain('Strong text');
  expect(markup).not.toContain('**Strong text**');
  expect(markup).not.toContain('<script');
  expect(markup).not.toContain('href="javascript:');
  expect(markup).not.toContain('<img');
});
