'use strict';

import assert from 'node:assert';
import { test } from 'node:test';

import { BASE_URL, DOC_NODE_VERSION } from '../../../../../constants.mjs';
import { createModuleSection } from '../module.mjs';

test('adds expected properties', () => {
  /**
   * @type {import('../../../../../utils/buildHierarchy.mjs').HierarchizedEntry}
   */
  const entry = { api: 'something' };

  /**
   * @type {import('../../../generated.d.ts').Module}
   */
  const section = {};
  createModuleSection(entry, section, DOC_NODE_VERSION);

  assert.deepStrictEqual(
    section['@see'],
    `${BASE_URL}docs/${DOC_NODE_VERSION}/api/${entry.api}.html`
  );
  assert.deepStrictEqual(section['@module'], `node:${entry.api}`);
});
