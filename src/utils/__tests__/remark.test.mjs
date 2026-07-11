import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import dedent from 'dedent';
import { visit } from 'unist-util-visit';

import { getRemarkRecma } from '../remark.mjs';

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

describe('getRemarkRecma', () => {
  it('preserves code tab display names when raw HTML is enabled', async () => {
    const processor = getRemarkRecma();
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
});
