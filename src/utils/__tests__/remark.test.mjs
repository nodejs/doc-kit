import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { getRemarkRecma } from '../remark.mjs';

const getCodeTabsAttributes = tree => {
  const attributes = [];

  const visit = node => {
    if (!node || typeof node !== 'object') {
      return;
    }

    if (node.type === 'JSXOpeningElement' && node.name?.name === 'CodeTabs') {
      attributes.push(
        Object.fromEntries(
          node.attributes.map(attribute => [
            attribute.name.name,
            attribute.value?.value,
          ])
        )
      );
    }

    Object.values(node).forEach(value => {
      if (Array.isArray(value)) {
        value.forEach(visit);
      } else {
        visit(value);
      }
    });
  };

  visit(tree);

  return attributes;
};

describe('getRemarkRecma', () => {
  it('preserves code tab display names when raw HTML is enabled', async () => {
    const processor = getRemarkRecma();
    const tree = await processor.run(
      processor.parse(`
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
