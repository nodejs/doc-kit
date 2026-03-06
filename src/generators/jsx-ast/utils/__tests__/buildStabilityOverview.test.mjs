import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import buildStabilityOverview from '../buildStabilityOverview.mjs';

const getAttribute = (node, name) =>
  node.attributes.find(attribute => attribute.name === name)?.value;

describe('buildStabilityOverview', () => {
  it('builds a table with expected headings and rows', () => {
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

    assert.equal(result.tagName, 'table');

    const thead = result.children[0];
    const tbody = result.children[1];

    assert.equal(thead.tagName, 'thead');
    assert.equal(tbody.tagName, 'tbody');
    assert.equal(tbody.children.length, 2);

    const headerCells = thead.children[0].children;
    assert.equal(headerCells[0].children[0].value, 'API');
    assert.equal(headerCells[1].children[0].value, 'Stability');
  });

  it('creates links and BadgeGroup cells with mapped props', () => {
    const [row] = buildStabilityOverview([
      {
        api: 'fs',
        name: 'File system',
        stabilityIndex: 0,
        stabilityDescription: 'Deprecated: use fs/promises',
      },
    ]).children[1].children;

    const link = row.children[0].children[0];
    const badgeGroup = row.children[1].children[0];

    assert.equal(link.tagName, 'a');
    assert.equal(link.properties.href, 'fs.html');
    assert.equal(link.children[0].value, 'File system');

    assert.equal(badgeGroup.name, 'BadgeGroup');
    assert.equal(getAttribute(badgeGroup, 'as'), 'span');
    assert.equal(getAttribute(badgeGroup, 'size'), 'small');
    assert.equal(getAttribute(badgeGroup, 'kind'), 'error');
    assert.equal(getAttribute(badgeGroup, 'badgeText'), '0');
    assert.equal(badgeGroup.children[0].value, 'Deprecated: use fs/promises');
  });

  it('falls back to success kind for unknown stability index', () => {
    const [row] = buildStabilityOverview([
      {
        api: 'custom',
        name: 'Custom API',
        stabilityIndex: 9,
        stabilityDescription: 'Unknown status',
      },
    ]).children[1].children;

    const badgeGroup = row.children[1].children[0];

    assert.equal(getAttribute(badgeGroup, 'kind'), 'success');
    assert.equal(getAttribute(badgeGroup, 'badgeText'), '9');
  });
});
