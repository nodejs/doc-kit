'use strict';

import assert from 'node:assert';
import { test } from 'node:test';

import { BASE_URL, NODE_VERSION } from '../../../../../constants.mjs';
import { createModuleSection } from '../module.mjs';

test('adds expected properties', () => {
  /**
   * @type {import('../../../../../utils/buildHierarchy.mjs').HierarchizedEntry}
   */
  const entry = { api: 'something' };

  /**
   * @type {import('../../../generated/generated.d.ts').Module}
   */
  const section = {};
  createModuleSection(entry, section, NODE_VERSION);

  assert.deepStrictEqual(
    section['@see'],
    `${BASE_URL}docs/${NODE_VERSION}/api/${entry.api}.html`
  );
  assert.deepStrictEqual(section['@module'], `node:${entry.api}`);
});
