import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { findParent, buildHierarchy } from '../buildHierarchy.mjs';

describe('findParent', () => {
  it('finds parent with lower depth', () => {
    const entries = [{ heading: { depth: 1 } }, { heading: { depth: 2 } }];
    const parent = findParent(entries[1], entries, 0);
    assert.equal(parent, entries[0]);
  });

  it('throws when no parent exists', () => {
    const entries = [{ heading: { depth: 2 } }];
    assert.throws(() => findParent(entries[0], entries, -1));
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
  });

  it('nests children under parents', () => {
    const entries = [{ heading: { depth: 1 } }, { heading: { depth: 2 } }];
    const result = buildHierarchy(entries);

    assert.equal(result.length, 1);
    assert.equal(result[0].hierarchyChildren.length, 1);
    assert.equal(result[0].hierarchyChildren[0], entries[1]);
  });

  it('handles multiple levels', () => {
    const entries = [
      { heading: { depth: 1 } },
      { heading: { depth: 2 } },
      { heading: { depth: 3 } },
    ];
    const result = buildHierarchy(entries);

    assert.equal(result.length, 1);
    assert.equal(result[0].hierarchyChildren[0].hierarchyChildren.length, 1);
  });
});
