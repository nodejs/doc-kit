// @ts-check
'use strict';

import test, { describe } from 'node:test';
import assert from 'node:assert';
import {
  createSectionBaseBuilder,
  ENTRY_TO_SECTION_TYPE,
} from '../../utils/createSectionBase.mjs';

const createSectionBase = createSectionBaseBuilder();

describe('determines the correct type for a section', () => {
  describe('type fallbacks', () => {
    test('fallbacks to `module` if heading depth is 1 and heading type is undefined', () => {
      /**
       * @type {import('../../utils/createSectionBase.mjs').HierarchizedEntry}
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
       * @type {import('../../utils/createSectionBase.mjs').HierarchizedEntry}
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
  });

  for (const entryType in ENTRY_TO_SECTION_TYPE) {
    const sectionType = ENTRY_TO_SECTION_TYPE[entryType];

    test(`\`${entryType}\` -> \`${sectionType}\``, () => {
      /**
       * @type {import('../../utils/createSectionBase.mjs').HierarchizedEntry}
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

describe('extracts description and examples correctly', () => {
  test('description with `text`', () => {
    /**
     * @type {import('../../utils/createSectionBase.mjs').HierarchizedEntry}
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
          type: 'module',
        },
      },
      stability: {
        type: 'root',
        children: [],
      },
      content: {
        type: 'root',
        children: [
          {
            type: 'text',
            value: 'this should be ignored',
          },
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
        ],
      },
      tags: [],
      yaml_position: {},
    };

    const section = createSectionBase(entry);

    assert.strictEqual(section.description, 'hello world');
  });

  test('description with `inlineCode` ', () => {
    /**
     * @type {import('../../utils/createSectionBase.mjs').HierarchizedEntry}
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
          type: 'module',
        },
      },
      stability: {
        type: 'root',
        children: [],
      },
      content: {
        type: 'root',
        children: [
          {
            type: 'text',
            value: 'this should be ignored',
          },
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
            type: 'inlineCode',
            value: 'world',
          },
        ],
      },
      tags: [],
      yaml_position: {},
    };

    const section = createSectionBase(entry);

    assert.strictEqual(section.description, 'hello `world`');
  });

  test('description with `link`', () => {
    /**
     * @type {import('../../utils/createSectionBase.mjs').HierarchizedEntry}
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
          type: 'module',
        },
      },
      stability: {
        type: 'root',
        children: [],
      },
      content: {
        type: 'root',
        children: [
          {
            type: 'text',
            value: 'this should be ignored',
          },
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
            label: 'world',
            url: 'https://nodejs.org',
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
        ],
      },
      tags: [],
      yaml_position: {},
    };

    const section = createSectionBase(entry);

    assert.strictEqual(
      section.description,
      'hello [world](https://nodejs.org) asd'
    );
  });

  test('extracts code examples', () => {
    /**
     * @type {import('../../utils/createSectionBase.mjs').HierarchizedEntry}
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
          type: 'module',
        },
      },
      stability: {
        type: 'root',
        children: [],
      },
      content: {
        type: 'root',
        children: [
          {
            type: 'text',
            value: 'this should be ignored',
          },
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
        ],
      },
      tags: [],
      yaml_position: {},
    };

    const section = createSectionBase(entry);

    assert.strictEqual(section.description, 'hello');
    assert.strictEqual(section['@example'], 'some code here');
  });
});

describe('`@deprecated`', () => {
  test('undefined if not deprecated', () => {
    /**
     * @type {import('../../utils/createSectionBase.mjs').HierarchizedEntry}
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
          type: 'module',
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

    const section = createSectionBase(entry);

    assert.equal(section['@deprecated'], undefined);
  });

  test('defined if deprecated', () => {
    /**
     * @type {import('../../utils/createSectionBase.mjs').HierarchizedEntry}
     */
    const entry = {
      hierarchyChildren: [],
      api: 'bla',
      slug: 'asd',
      api_doc_source: 'doc/api/something.md',
      changes: [],
      deprecated_in: ['v10.0.0', 'v11.1.0'],
      heading: {
        type: 'heading',
        depth: 2,
        children: [],
        data: {
          text: 'Some title',
          name: 'Some title',
          depth: 2,
          slug: 'some-title',
          type: 'module',
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

    const section = createSectionBase(entry);

    assert.deepStrictEqual(section['@deprecated'], ['v10.0.0', 'v11.1.0']);
  });
});

describe('`stability`', () => {
  test('undefined if not provided', () => {
    /**
     * @type {import('../../utils/createSectionBase.mjs').HierarchizedEntry}
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
          type: 'module',
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

    const section = createSectionBase(entry);

    assert.equal(section.stability, undefined);
  });

  test('defined if provided', () => {
    /**
     * @type {import('../../utils/createSectionBase.mjs').HierarchizedEntry}
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
          type: 'module',
        },
      },
      stability: {
        type: 'root',
        children: [
          {
            data: {
              index: 0,
              description: 'something',
            },
          },
        ],
      },
      content: {
        type: 'root',
        children: [],
      },
      tags: [],
      yaml_position: {},
    };

    const section = createSectionBase(entry);

    assert.deepStrictEqual(section.stability, {
      value: 0,
      text: 'something',
    });
  });
});

describe('`changes`, `@since`, `napiVersion`, `removedIn`', () => {
  test('undefined if not provided', () => {
    /**
     * @type {import('../../utils/createSectionBase.mjs').HierarchizedEntry}
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
          type: 'module',
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

    const section = createSectionBase(entry);

    assert.equal(section.changes, undefined);
    assert.equal(section['@since'], undefined);
    assert.equal(section.napiVersion, undefined);
    assert.equal(section.removedIn, undefined);
  });

  test('defined if provided', () => {
    /**
     * @type {import('../../utils/createSectionBase.mjs').HierarchizedEntry}
     */
    const entry = {
      hierarchyChildren: [],
      api: 'bla',
      slug: 'asd',
      api_doc_source: 'doc/api/something.md',
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
      heading: {
        type: 'heading',
        depth: 2,
        children: [],
        data: {
          text: 'Some title',
          name: 'Some title',
          depth: 2,
          slug: 'some-title',
          type: 'module',
        },
      },
      stability: {
        type: 'root',
        children: [
          {
            data: {
              index: 0,
              description: 'something',
            },
          },
        ],
      },
      content: {
        type: 'root',
        children: [],
      },
      tags: [],
      yaml_position: {},
    };

    const section = createSectionBase(entry);

    assert.deepStrictEqual(section.changes, [
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
    assert.deepStrictEqual(section['@since'], ['v5.0.0']);
    assert.deepStrictEqual(section.napiVersion, ['v5.0.0']);
    assert.deepStrictEqual(section.removedIn, ['v20.0.0']);
  });
});
