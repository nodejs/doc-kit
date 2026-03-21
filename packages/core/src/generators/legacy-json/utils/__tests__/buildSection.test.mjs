'use strict';

import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { UNPROMOTED_KEYS } from '../../constants.mjs';
import { promoteMiscChildren } from '../buildSection.mjs';

describe('promoteMiscChildren', () => {
  /**
   * @template {object} T
   *
   * @param {T} base
   * @param {'section'|'parent'} [type='section']
   * @returns {T}
   */
  function buildReadOnlySection(base, type = 'section') {
    return new Proxy(base, {
      set(_, key) {
        throw new Error(`${type} property '${String(key)} modified`);
      },
    });
  }

  test('ignores non-misc section', () => {
    const section = buildReadOnlySection({
      type: 'text',
    });

    const parent = buildReadOnlySection(
      {
        type: 'text',
      },
      'parent'
    );

    promoteMiscChildren(section, parent);
  });

  test('ignores misc parent', () => {
    const section = buildReadOnlySection({
      type: 'misc',
    });

    const parent = buildReadOnlySection(
      {
        type: 'misc',
      },
      'parent'
    );

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

    const parent = {
      type: 'module',
    };

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

      const parent = {
        type: 'module',
      };

      promoteMiscChildren(section, parent);

      assert.deepStrictEqual(parent.someValue, 'bar');
    });
  });
});
