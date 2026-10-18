import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { pathToFileURL } from 'node:url';

import { loadGenerator } from '@doc-kit/core/generators/loader.mjs';
import { loadMarkdownPlugins } from '@doc-kit/core/utils/markdown/plugins.mjs';
import { getProcessor } from '@doc-kit/core/utils/markdown/processor.mjs';
import dedent from 'dedent';
import { visit } from 'unist-util-visit';

const jsxAst = await loadGenerator(import.meta.resolve('../index.mjs'));

await loadMarkdownPlugins(jsxAst);

const getCodeTabsAttributes = tree => {
  const attributes = [];

  visit(tree.body[0].expression, 'JSXElement', node => {
    if (node.openingElement.name?.name === 'CodeTabs') {
      attributes.push(
        Object.fromEntries(
          node.openingElement.attributes.map(attribute => [
            attribute.name.name,
            attribute.value?.value,
          ])
        )
      );
    }
  });

  return attributes;
};

describe('the Markdown pipeline of jsx-ast', () => {
  it('preserves code tab display names when raw HTML is enabled', async () => {
    const processor = getProcessor('jsx-ast');
    const tree = await processor.run(
      processor.parse(dedent`
			<div class="note">raw html</div>

			\`\`\`cjs displayName="main.js"
			console.log(1);
			\`\`\`

			\`\`\`cjs displayName="main.test.js"
			console.log(2);
			\`\`\`
			`)
    );

    assert.deepEqual(getCodeTabsAttributes(tree), [
      {
        languages: 'cjs|cjs',
        displayNames: 'main.js|main.test.js',
        defaultTab: '0',
      },
    ]);
  });

  it('runs the configured rehype plugins before code is highlighted', async t => {
    // Records the classes of the code blocks it gets
    const recorder = join(mkdtempSync(join(tmpdir(), 'jsx-ast-')), 'rec.mjs');

    writeFileSync(
      recorder,
      `export default () => tree => {
        for (const node of tree.children) {
          if (node.tagName === 'pre') {
            globalThis.recorded.push(node.children[0].properties.className);
          }
        }
      };`
    );

    globalThis.recorded = [];

    await loadMarkdownPlugins(jsxAst, {
      rehypePlugins: [pathToFileURL(recorder).href],
    });

    t.after(() => loadMarkdownPlugins(jsxAst));

    const markdown = '```js\nconst a = 1;\n```\n';

    const processor = getProcessor('jsx-ast');

    await processor.run(processor.parse(markdown));

    assert.deepStrictEqual(globalThis.recorded, [['language-js']]);

    // The fragments doc-kit renders itself run without them
    const own = getProcessor('jsx-ast', { configured: false });

    own.runSync(own.parse(markdown));

    assert.deepStrictEqual(globalThis.recorded, [['language-js']]);
  });
});
