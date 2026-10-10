import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, describe, it } from 'node:test';
import { pathToFileURL } from 'node:url';

import { loadMarkdownPlugins } from '../plugins.mjs';
import { getProcessor } from '../processor.mjs';

const dir = mkdtempSync(join(tmpdir(), 'doc-kit-processor-'));

// What the plugins below saw, in the order they ran
const seen = [];

globalThis.seenByPlugins = seen;

/**
 * Writes a plugin recording the type of the first node of its tree, and
 * whether it processes MDX, returning its URL.
 *
 * @param {string} name
 */
const recorder = name => {
  writeFileSync(
    join(dir, `${name}.mjs`),
    `export default function ${name}() {
      const mdx = this.data('mdx') ? ' (MDX)' : '';

      return tree => {
        globalThis.seenByPlugins.push('${name}: ' + tree.children[0].type + mdx);
      };
    }`
  );

  return pathToFileURL(join(dir, `${name}.mjs`)).href;
};

// A pipeline turning Markdown into HTML, with doc-kit's Markdown syntax
await loadMarkdownPlugins(
  {
    name: 'to-html',
    markdown: {
      remarkPlugins: [
        import.meta.resolve('remark-parse'),
        import.meta.resolve('#plugins/type-annotations/remark.mjs'),
        import.meta.resolve('remark-gfm'),
        '...',
      ],
      rehypePlugins: [
        import.meta.resolve('remark-rehype'),
        '...',
        import.meta.resolve('rehype-stringify'),
      ],
    },
  },
  { remarkPlugins: [recorder('remark')], rehypePlugins: [recorder('rehype')] }
);

describe('getProcessor', () => {
  beforeEach(() => {
    seen.length = 0;
  });

  it('runs the plugins of each syntax tree in turn', async () => {
    const html = await getProcessor('to-html').process('# Hi ~~there~~');

    assert.equal(String(html), '<h1>Hi <del>there</del></h1>');
    assert.deepStrictEqual(seen, ['remark: heading', 'rehype: element']);
  });

  it('processes MDX, telling the plugins so', async () => {
    const processor = getProcessor('to-html', { mdx: true });

    // `{...}` is an expression in MDX, and a type annotation in Markdown
    const [paragraph] = processor.parse('A {string}').children;

    assert.equal(paragraph.children[1].type, 'mdxTextExpression');
    assert.equal(
      getProcessor('to-html').parse('A {string}').children[0].children[1].type,
      'typeAnnotation'
    );

    await processor.process('<A />');

    assert.deepStrictEqual(seen, [
      'remark: mdxJsxFlowElement (MDX)',
      'rehype: element (MDX)',
    ]);
  });

  it('runs without the configured plugins, if asked', async () => {
    await getProcessor('to-html', { configured: false }).process('# Hi');

    assert.deepStrictEqual(seen, []);
  });

  it('gives the same processor for the same pipeline', () => {
    assert.equal(getProcessor('to-html'), getProcessor('to-html'));
    assert.notEqual(
      getProcessor('to-html'),
      getProcessor('to-html', { mdx: true })
    );
  });
});
