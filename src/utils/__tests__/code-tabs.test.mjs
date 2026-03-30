'use strict';

import { strictEqual } from 'node:assert';
import { describe, it } from 'node:test';

import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';
import { visit } from 'unist-util-visit';

import codeTabs from '../code-tabs.mjs';

function process(markdown) {
  const processor = unified().use(remarkParse).use(remarkRehype).use(codeTabs);

  return processor.run(processor.parse(markdown));
}

function collectCodeMeta(tree) {
  const meta = [];

  visit(tree, 'element', node => {
    if (node.tagName === 'code') {
      meta.push(node.data?.meta ?? null);
    }
  });

  return meta;
}

describe('codeTabs', () => {
  it('assigns display names to consecutive blocks with the same language', async () => {
    const tree = await process(`
\`\`\`js
console.log('one');
\`\`\`

\`\`\`js
console.log('two');
\`\`\`
    `);

    const meta = collectCodeMeta(tree);

    strictEqual(meta[0], 'displayName="(1)"');
    strictEqual(meta[1], 'displayName="(2)"');
  });

  it('does not modify blocks when languages are different', async () => {
    const tree = await process(`
\`\`\`js
console.log('hello');
\`\`\`

\`\`\`python
print('hello')
\`\`\`
    `);

    const meta = collectCodeMeta(tree);

    strictEqual(meta[0], null);
    strictEqual(meta[1], null);
  });

  it('does not modify a single code block', async () => {
    const tree = await process(`
\`\`\`js
console.log('hello');
\`\`\`
    `);

    const meta = collectCodeMeta(tree);

    strictEqual(meta[0], null);
  });
});
