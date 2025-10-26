'use strict';

import { test } from 'node:test';
import assert from 'node:assert';
import { createModuleSectionBuilder } from '../createModuleSection.mjs';
import { DOC_NODE_VERSION } from '../../../../constants.mjs';

const createModuleSection = createModuleSectionBuilder();

test('adds expected properties', () => {
  /**
   * @type {import('../createSectionBase.mjs').HierarchizedEntry}
   */
  const entry = { api: 'something' };

  /**
   * @type {import('../../generated.d.ts').Module}
   */
  const section = {};
  createModuleSection(entry, section);

  assert.deepStrictEqual(
    section['@see'],
    `https://nodejs.org/dist/${DOC_NODE_VERSION}/doc/api/${entry.api}.html`
  );
  assert.deepStrictEqual(section['@module'], `node:${entry.api}`);
});
