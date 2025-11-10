// @ts-check
'use strict';

import assert from 'node:assert';
import { test } from 'node:test';

import { DOC_NODE_VERSION } from '../../../../constants.mjs';
import { createSectionBuilder } from '../createSection.mjs';

const createSection = createSectionBuilder();

test('empty `module` section', () => {
  /**
   * @type {import('../createSectionBase.mjs').HierarchizedEntry}
   */
  const entry = {
    hierarchyChildren: [],
    api: 'bla',
    slug: 'asd',
    api_doc_source: 'doc/api/something.md',
    changes: [],
    heading: {
      type: 'heading',
      depth: 1,
      children: [],
      data: {
        text: 'Some title',
        name: 'Some title',
        depth: 1,
        slug: 'some-title',
        type: undefined,
      },
    },
    stability: {
      type: 'root',
      children: [],
    },
    content: {
      type: 'root',
      children: [],
    },
    tags: [],
    yaml_position: {},
  };

  assert.deepStrictEqual(createSection(entry, [entry]), {
    $schema: `https://nodejs.org/docs/${DOC_NODE_VERSION}/api/node-doc-schema.json`,
    source: 'doc/api/something.md',
    '@module': 'node:bla',
    '@see': `https://nodejs.org/docs/${DOC_NODE_VERSION}/api/bla.html`,
    type: 'module',
    '@name': 'Some title',
  });
});

test('empty `text` section', () => {
  /**
   * @type {import('../createSectionBase.mjs').HierarchizedEntry}
   */
  const entry = {
    hierarchyChildren: [],
    api: 'bla',
    slug: 'asd',
    api_doc_source: 'doc/api/something.md',
    changes: [],
    heading: {
      type: 'heading',
      depth: 1,
      children: [],
      data: {
        text: 'Some title',
        name: 'Some title',
        depth: 1,
        slug: 'some-title',
        type: 'misc',
      },
    },
    stability: {
      type: 'root',
      children: [],
    },
    content: {
      type: 'root',
      children: [],
    },
    tags: [],
    yaml_position: {},
  };

  assert.deepStrictEqual(createSection(entry, [entry]), {
    $schema: `https://nodejs.org/docs/${DOC_NODE_VERSION}/api/node-doc-schema.json`,
    source: 'doc/api/something.md',
    type: 'text',
    '@name': 'Some title',
  });
});
