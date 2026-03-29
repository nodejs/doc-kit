import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import buildStabilityOverview from '../buildStabilityOverview.mjs';

const getAttribute = (node, name) =>
  node.attributes.find(attribute => attribute.name === name)?.value;

const getAttributeExpression = (node, name) =>
  getAttribute(node, name)?.data?.estree?.body?.[0]?.expression;

describe('buildStabilityOverview', () => {
  it('builds a StabilityOverview JSX block element', () => {
    const entries = [
      {
        api: 'fs',
        name: 'File system',
        stabilityIndex: 2,
        stabilityDescription: 'Stable',
      },
      {
        api: 'async_context',
        name: 'Async context',
        stabilityIndex: 1,
        stabilityDescription: 'Experimental',
      },
    ];

    const result = buildStabilityOverview(entries);

    assert.equal(result.type, 'mdxJsxFlowElement');
    assert.equal(result.name, 'StabilityOverview');
  });

  it('serializes entries into the entries prop', () => {
    const result = buildStabilityOverview([
      {
        api: 'fs',
        name: 'File system',
        stabilityIndex: 0,
        stabilityDescription: 'Deprecated: use fs/promises',
      },
      {
        api: 'timers',
        name: 'Timers',
        stabilityIndex: 2,
        stabilityDescription: 'Stable',
      },
    ]);

    const entriesExpression = getAttributeExpression(result, 'entries');

    assert.equal(entriesExpression.type, 'ArrayExpression');
    assert.equal(entriesExpression.elements.length, 2);

    const firstEntry = entriesExpression.elements[0];
    const firstApi = firstEntry.properties.find(
      ({ key }) => key.name === 'api'
    );
    const firstStabilityIndex = firstEntry.properties.find(
      ({ key }) => key.name === 'stabilityIndex'
    );

    assert.equal(firstApi.value.value, 'fs');
    assert.equal(firstStabilityIndex.value.value, 0);
  });
});
