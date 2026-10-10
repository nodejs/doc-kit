import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { loadGenerator } from '@doc-kit/core/generators/loader.mjs';
import { loadMarkdownPlugins } from '@doc-kit/core/utils/markdown/plugins.mjs';
import { getProcessor } from '@doc-kit/core/utils/markdown/processor.mjs';

await loadMarkdownPlugins(
  await loadGenerator(import.meta.resolve('../index.mjs'))
);

describe('the Markdown pipeline of legacy-json', () => {
  it('degrades MDX nodes instead of crashing rehype-stringify', () => {
    const processor = getProcessor('legacy-json');

    const tree = {
      type: 'root',
      children: [
        {
          type: 'paragraph',
          children: [
            { type: 'text', value: 'before ' },
            {
              type: 'mdxJsxTextElement',
              name: 'Tooltip',
              attributes: [],
              children: [{ type: 'text', value: 'inner' }],
            },
            { type: 'mdxTextExpression', value: '1 + 1' },
          ],
        },
        {
          type: 'mdxJsxFlowElement',
          name: 'DocumentationIndex',
          attributes: [],
          children: [],
        },
      ],
    };

    const output = processor.stringify(processor.runSync(tree));

    // JSX elements degrade to their children; expressions are dropped.
    assert.equal(output, '<p>before inner</p>');
  });
});
