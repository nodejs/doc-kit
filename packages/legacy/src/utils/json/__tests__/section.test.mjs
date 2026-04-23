'use strict';

import assert from 'node:assert/strict';
import { describe, it, test } from 'node:test';

import { UNPROMOTED_KEYS } from '../constants.mjs';
import {
  findParent,
  buildHierarchy,
  promoteMiscChildren,
} from '../section.mjs';

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

  it('re-attaches siblings to the nearest valid ancestor', () => {
    const entries = [
      { heading: { depth: 1 } },
      { heading: { depth: 2 } },
      { heading: { depth: 3 } },
      { heading: { depth: 2 } },
    ];
    const result = buildHierarchy(entries);

    assert.equal(result.length, 1);
    assert.equal(result[0].hierarchyChildren.length, 2);
    assert.equal(result[0].hierarchyChildren[1], entries[3]);
  });
});

describe('promoteMiscChildren', () => {
  /**
   * @template {object} T
   * @param {T} base
   * @param {'section'|'parent'} [type='section']
   * @returns {T}
   */
  const buildReadOnlySection = (base, type = 'section') =>
    new Proxy(base, {
      set(_, key) {
        throw new Error(`${type} property '${String(key)} modified`);
      },
    });

  test('ignores non-misc section', () => {
    const section = buildReadOnlySection({ type: 'text' });
    const parent = buildReadOnlySection({ type: 'text' }, 'parent');

    promoteMiscChildren(section, parent);
  });

  test('ignores misc parent', () => {
    const section = buildReadOnlySection({ type: 'misc' });
    const parent = buildReadOnlySection({ type: 'misc' }, 'parent');

    promoteMiscChildren(section, parent);
  });

  test('ignores keys in UNPROMOTED_KEYS', () => {
    const sectionRaw = {
      type: 'misc',
      promotableKey: 'this should be promoted',
    };

    UNPROMOTED_KEYS.forEach(key => {
      if (key === 'type') {
        return;
      }
      sectionRaw[key] = 'this should be ignored';
    });

    const section = buildReadOnlySection(sectionRaw);
    const parent = { type: 'module' };

    promoteMiscChildren(section, parent);

    UNPROMOTED_KEYS.forEach(key => {
      if (key === 'type') {
        return;
      }
      if (parent[key]) {
        throw new Error(`'${key}' was promoted`);
      }
    });

    assert.strictEqual(parent.promotableKey, section.promotableKey);
  });

  describe('merges properties correctly', () => {
    test('pushes child property if parent is an array', () => {
      const section = buildReadOnlySection({
        type: 'misc',
        someValue: 'bar',
      });

      const parent = {
        type: 'module',
        someValue: ['foo'],
      };

      promoteMiscChildren(section, parent);

      assert.deepStrictEqual(parent.someValue, ['foo', 'bar']);
    });

    test('ignores child property if parent has a value that is not an array', () => {
      const section = buildReadOnlySection({
        type: 'misc',
        someValue: 'bar',
      });

      const parent = {
        type: 'module',
        someValue: 'foo',
      };

      promoteMiscChildren(section, parent);

      assert.strictEqual(parent.someValue, 'foo');
    });

    test('promotes child property if parent does not have the property', () => {
      const section = buildReadOnlySection({
        type: 'misc',
        someValue: 'bar',
      });

      const parent = { type: 'module' };

      promoteMiscChildren(section, parent);

      assert.deepStrictEqual(parent.someValue, 'bar');
    });
  });
});
