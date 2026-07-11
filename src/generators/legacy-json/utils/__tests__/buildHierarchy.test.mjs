import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { findParent, buildHierarchy } from '../buildHierarchy.mjs';

describe('findParent', () => {
  it('finds parent with lower depth', () => {
    const nodes = [
      { entry: { heading: { depth: 1 } }, children: [] },
      { entry: { heading: { depth: 2 } }, children: [] },
    ];
    const parent = findParent(nodes[1].entry, nodes, 0);
    assert.equal(parent, nodes[0]);
  });

  it('throws when no parent exists', () => {
    const nodes = [{ entry: { heading: { depth: 2 } }, children: [] }];
    assert.throws(() => findParent(nodes[0].entry, nodes, -1));
  });
});

describe('buildHierarchy', () => {
  it('returns empty array for empty input', () => {
    assert.deepEqual(buildHierarchy([]), []);
  });

  it('keeps root entries at top level', () => {
    const entries = [{ heading: { depth: 1 } }, { heading: { depth: 1 } }];
    const result = buildHierarchy(entries);
    assert.equal(result.length, 2);
    assert.equal(result[0].entry, entries[0]);
    assert.equal(result[1].entry, entries[1]);
  });

  it('nests children under parents', () => {
    const entries = [{ heading: { depth: 1 } }, { heading: { depth: 2 } }];
    const result = buildHierarchy(entries);

    assert.equal(result.length, 1);
    assert.equal(result[0].children.length, 1);
    assert.equal(result[0].children[0].entry, entries[1]);
  });

  it('handles multiple levels', () => {
    const entries = [
      { heading: { depth: 1 } },
      { heading: { depth: 2 } },
      { heading: { depth: 3 } },
    ];
    const result = buildHierarchy(entries);

    assert.equal(result.length, 1);
    assert.equal(result[0].children[0].children.length, 1);
  });
});
