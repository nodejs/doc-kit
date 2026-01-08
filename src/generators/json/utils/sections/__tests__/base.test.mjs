'use strict';

import assert from 'node:assert';
import test, { describe } from 'node:test';

import { ENTRY_TO_SECTION_TYPE } from '../../../constants.mjs';
import {
  addDescriptionAndExamples,
  addStabilityStatus,
  addVersionProperties,
  createSectionBase,
} from '../base.mjs';

describe('determines the correct type for a section', () => {
  describe('type fallbacks', () => {
    test('fallbacks to `module` if heading depth is 1 and heading type is undefined', () => {
      /**
       * @type {import('../../../../../utils/buildHierarchy.mjs').HierarchizedEntry}
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

      assert.deepStrictEqual(createSectionBase(entry), {
        type: 'module',
        '@name': 'Some title',
      });
    });

    test('fallbacks to `text` if heading depth is > 1 and heading type is undefined', () => {
      /**
       * @type {import('../../../../../utils/buildHierarchy.mjs').HierarchizedEntry}
       */
      const entry = {
        hierarchyChildren: [],
        api: 'bla',
        slug: 'asd',
        api_doc_source: 'doc/api/something.md',
        changes: [],
        heading: {
          type: 'heading',
          depth: 2,
          children: [],
          data: {
            text: 'Some title',
            name: 'Some title',
            depth: 2,
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

      assert.deepStrictEqual(createSectionBase(entry), {
        type: 'text',
        '@name': 'Some title',
      });
    });

    test('doc/api/process.md determined as module and not a global', () => {
      /**
       * @type {import('../../../../../utils/buildHierarchy.mjs').HierarchizedEntry}
       */
      const entry = {
        hierarchyChildren: [],
        api: 'process',
        slug: 'asd',
        api_doc_source: 'doc/api/something.md',
        changes: [],
        heading: {
          type: 'heading',
          depth: 1,
          children: [],
          data: {
            text: 'Process',
            name: 'Process',
            depth: 1,
            slug: 'process',
            type: 'global',
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

      assert.deepStrictEqual(createSectionBase(entry), {
        type: 'module',
        '@name': 'Process',
      });
    });
  });

  for (const entryType in ENTRY_TO_SECTION_TYPE) {
    const sectionType = ENTRY_TO_SECTION_TYPE[entryType];

    test(`\`${entryType}\` -> \`${sectionType}\``, () => {
      /**
       * @type {import('../../../../../utils/buildHierarchy.mjs').HierarchizedEntry}
       */
      const entry = {
        hierarchyChildren: [],
        api: 'bla',
        slug: 'asd',
        api_doc_source: 'doc/api/something.md',
        changes: [],
        heading: {
          type: 'heading',
          depth: 2,
          children: [],
          data: {
            text: 'Some title',
            name: 'Some title',
            depth: 2,
            slug: 'some-title',
            type: entryType,
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

      assert.deepStrictEqual(createSectionBase(entry), {
        type: sectionType,
        '@name': 'Some title',
      });
    });
  }
});

describe('addDescriptionAndExamples', () => {
  test('description with `text`', () => {
    /**
     * @type {import('../../../generated/generated.d.ts')}
     */
    const base = {};

    addDescriptionAndExamples(base, [
      {
        type: 'paragraph',
        children: [
          {
            type: 'text',
            value: 'hello',
          },
        ],
      },
      {
        type: 'paragraph',
        children: [
          {
            type: 'text',
            value: 'world',
          },
        ],
      },
    ]);

    assert.deepStrictEqual(base.description, 'hello\nworld');
  });

  test('description with `inlineCode`', () => {
    /**
     * @type {import('../../../generated/generated.d.ts')}
     */
    const base = {};

    addDescriptionAndExamples(base, [
      {
        type: 'paragraph',
        children: [
          {
            type: 'text',
            value: 'hello ',
          },
          {
            type: 'inlineCode',
            value: 'world',
          },
        ],
      },
      {
        type: 'paragraph',
        children: [
          {
            type: 'text',
            value: 'asd',
          },
        ],
      },
    ]);

    assert.strictEqual(base.description, 'hello `world`\nasd');
  });

  test('description with `link`', () => {
    /**
     * @type {import('../../../generated/generated.d.ts')}
     */
    const base = {};

    addDescriptionAndExamples(base, [
      {
        type: 'paragraph',
        children: [
          {
            type: 'text',
            value: 'hello',
          },
        ],
      },
      {
        type: 'link',
        url: 'https://nodejs.org',
        children: [
          {
            type: 'text',
            value: 'world',
          },
        ],
      },
      {
        type: 'paragraph',
        children: [
          {
            type: 'text',
            value: 'asd',
          },
        ],
      },
    ]);

    assert.strictEqual(
      base.description,
      'hello\n[world](https://nodejs.org) asd'
    );
  });

  test('description with `emphasis`', () => {
    /**
     * @type {import('../../../generated/generated.d.ts')}
     */
    const base = {};

    addDescriptionAndExamples(base, [
      {
        type: 'paragraph',
        children: [
          {
            type: 'text',
            value: 'hello',
          },
        ],
      },
      {
        type: 'emphasis',
        children: [
          {
            type: 'text',
            value: 'world',
          },
        ],
      },
    ]);

    assert.strictEqual(base.description, 'hello\n_world_');
  });

  test('extracts single code example', () => {
    /**
     * @type {import('../../../generated/generated.d.ts')}
     */
    const base = {};

    addDescriptionAndExamples(base, [
      {
        type: 'paragraph',
        children: [
          {
            type: 'text',
            value: 'hello',
          },
        ],
      },
      {
        type: 'code',
        value: 'some code here',
      },
    ]);

    assert.strictEqual(base.description, 'hello');
    assert.strictEqual(base['@example'], 'some code here');
  });

  test('extracts multiple code examples', () => {
    /**
     * @type {import('../../../generated/generated.d.ts')}
     */
    const base = {};

    addDescriptionAndExamples(base, [
      {
        type: 'paragraph',
        children: [
          {
            type: 'text',
            value: 'hello',
          },
        ],
      },
      {
        type: 'code',
        value: 'some code here',
      },
      {
        type: 'code',
        value: 'more code',
      },
      {
        type: 'code',
        value: 'asd',
      },
    ]);

    assert.strictEqual(base.description, 'hello');
    assert.deepStrictEqual(base['@example'], [
      'some code here',
      'more code',
      'asd',
    ]);
  });
});

describe('addStabilityStatus', () => {
  test('defined if provided', () => {
    /**
     * @type {import('../../../generated/generated.d.ts')}
     */
    const base = {};

    addStabilityStatus(base, {
      stability: {
        type: 'root',
        children: [
          {
            data: {
              index: 0,
              description: 'description',
            },
          },
        ],
      },
    });

    assert.deepStrictEqual(base.stability, {
      value: 0,
      text: 'description',
    });
  });

  test('undefined if not provided', () => {
    /**
     * @type {import('../../../generated/generated.d.ts')}
     */
    const base = {};

    addStabilityStatus(base, {
      stability: {
        type: 'root',
        children: [
          {
            data: {
              index: 0,
              description: 'description',
            },
          },
        ],
      },
    });

    assert.deepStrictEqual(base.stability, {
      value: 0,
      text: 'description',
    });
  });
});

describe('addVersionProperties', () => {
  test('defined in provided', () => {
    /**
     * @type {import('../../../generated/generated.d.ts')}
     */
    const base = {};

    addVersionProperties(base, {
      changes: [
        {
          description: 'bla',
          'pr-url': 'https://github.com/nodejs/node',
          version: ['v10.0.0'],
        },
        {
          description: 'asd',
          'pr-url': 'https://github.com/nodejs/node',
          version: 'v10.2.0',
        },
      ],
      added_in: ['v5.0.0'],
      n_api_version: ['v5.0.0'],
      removed_in: ['v20.0.0'],
      deprecated_in: ['v20.0.0'],
    });

    assert.deepStrictEqual(base.changes, [
      {
        description: 'bla',
        prUrl: 'https://github.com/nodejs/node',
        version: ['v10.0.0'],
      },
      {
        description: 'asd',
        prUrl: 'https://github.com/nodejs/node',
        version: ['v10.2.0'],
      },
    ]);
    assert.deepStrictEqual(base['@since'], ['v5.0.0']);
    assert.deepStrictEqual(base.napiVersion, ['v5.0.0']);
    assert.deepStrictEqual(base.removedIn, ['v20.0.0']);
    assert.deepStrictEqual(base['@deprecated'], ['v20.0.0']);
  });

  test('undefined if not provided', () => {
    /**
     * @type {import('../../../generated/generated.d.ts')}
     */
    const base = {};

    addVersionProperties(base, { changes: [] });

    assert.equal(base.changes, undefined);
    assert.equal(base['@since'], undefined);
    assert.equal(base.napiVersion, undefined);
    assert.equal(base.removedIn, undefined);
    assert.equal(base['@deprecated'], undefined);
  });
});
