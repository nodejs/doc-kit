import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { getRemarkRehype } from '../remark.mjs';

describe('getRemarkRehype', () => {
  it('degrades MDX nodes instead of crashing rehype-stringify', () => {
    const processor = getRemarkRehype();

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
