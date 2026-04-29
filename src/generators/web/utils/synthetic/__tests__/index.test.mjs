import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildStabilityOverview } from '../index.mjs';

const fakeHead = (api, name, stabilityIndex, depth = 1) => ({
  api,
  heading: { depth, data: { name, text: name, slug: api } },
  stability:
    stabilityIndex == null
      ? null
      : {
          data: {
            index: String(stabilityIndex),
            description: `${name} stable. Long-form description.`,
          },
        },
});

const findChild = (node, tagName) =>
  node.children.find(child => child.tagName === tagName);

describe('buildStabilityOverview', () => {
  it('renders a header row and one body row per entry', () => {
    const table = buildStabilityOverview([
      fakeHead('fs', 'fs', 2),
      fakeHead('crypto', 'crypto', 1),
    ]);

    assert.equal(table.tagName, 'table');
    const headerRow = findChild(findChild(table, 'thead'), 'tr');
    assert.deepEqual(
      headerRow.children.map(c => c.children[0].value),
      ['API', 'Stability']
    );

    assert.equal(findChild(table, 'tbody').children.length, 2);
  });

  it('formats the stability cell as `(index) <first sentence>`', () => {
    const table = buildStabilityOverview([fakeHead('fs', 'fs', 1)]);

    const row = findChild(table, 'tbody').children[0];
    const stabilityCell = row.children[1];

    assert.equal(stabilityCell.children[0].value, '(1) fs stable');
  });

  it('builds a relative link to the module HTML page', () => {
    const table = buildStabilityOverview([fakeHead('fs', 'fs', 2)]);

    const row = findChild(table, 'tbody').children[0];
    const link = row.children[0].children[0];

    assert.equal(link.tagName, 'a');
    assert.equal(link.properties.href, 'fs.html');
    assert.equal(link.children[0].value, 'fs');
  });

  it('renders an empty body when no entries are passed', () => {
    const table = buildStabilityOverview([]);

    assert.equal(findChild(table, 'tbody').children.length, 0);
  });
});
