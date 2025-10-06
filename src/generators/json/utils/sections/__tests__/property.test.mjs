'use strict';

import assert from 'node:assert';
import { describe, test } from 'node:test';

import { DOC_TYPE_TO_CORRECT_JS_TYPE_MAP } from '../../../constants.mjs';
import { parseDescription, parseType } from '../property.mjs';

describe('parseType', () => {
  test('defaults to `any` if first child is not a list', () => {
    /**
     * @type {import('../../../../../utils/buildHierarchy.mjs').HierarchizedEntry}
     */
    const entry = {
      content: {
        children: [
          undefined, // Should be ignored
          {
            type: 'text',
            value: 'asd',
          },
        ],
      },
    };

    /**
     * @type {import('../../../generated.d.ts').Property}
     */
    const section = {};

    parseType(entry, section);

    assert.deepStrictEqual(section, {
      '@type': 'any',
    });
  });

  describe('<type> [description] [**Default:** `value`]', () => {
    for (const originalType of Object.keys(DOC_TYPE_TO_CORRECT_JS_TYPE_MAP)) {
      const expectedType = DOC_TYPE_TO_CORRECT_JS_TYPE_MAP[originalType];

      test(`'${originalType}' -> '${expectedType}'`, () => {
        /**
         * @type {import('../../../../../utils/buildHierarchy.mjs').HierarchizedEntry}
         */
        const entry = {
          content: {
            children: [
              undefined, // Should be ignored
              {
                type: 'list',
                children: [
                  {
                    type: 'listItem',
                    children: [
                      {
                        type: 'paragraph',
                        children: [
                          {
                            type: 'link',
                            url: 'https://mdn-link',
                            children: [
                              {
                                type: 'inlineCode',
                                value: `<${originalType}>`,
                              },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        };

        /**
         * @type {import('../../../generated.d.ts').Property}
         */
        const section = {};

        parseType(entry, section);

        assert.deepStrictEqual(section, {
          '@type': expectedType,
        });
      });
    }

    test('{number}', () => {
      /**
       * @type {import('../../../../../utils/buildHierarchy.mjs').HierarchizedEntry}
       */
      const entry = {
        content: {
          children: [
            undefined, // Should be ignored
            {
              type: 'list',
              children: [
                {
                  type: 'listItem',
                  children: [
                    {
                      type: 'paragraph',
                      children: [
                        {
                          type: 'link',
                          url: 'https://mdn-link',
                          children: [
                            {
                              type: 'inlineCode',
                              value: '<number>',
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      };

      /**
       * @type {import('../../../generated.d.ts').Property}
       */
      const section = {};

      parseType(entry, section);

      assert.deepStrictEqual(section, {
        '@type': 'number',
      });
    });

    test('{number[]}', () => {
      /**
       * @type {import('../../../../../utils/buildHierarchy.mjs').HierarchizedEntry}
       */
      const entry = {
        content: {
          children: [
            undefined, // Should be ignored
            {
              type: 'list',
              children: [
                {
                  type: 'listItem',
                  children: [
                    {
                      type: 'paragraph',
                      children: [
                        {
                          type: 'link',
                          url: 'https://mdn-link',
                          children: [
                            {
                              type: 'inlineCode',
                              value: '<number[]>',
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      };

      /**
       * @type {import('../../../generated.d.ts').Property}
       */
      const section = {};

      parseType(entry, section);

      assert.deepStrictEqual(section, {
        '@type': 'number[]',
      });
    });

    test('{number|boolean}', () => {
      /**
       * @type {import('../../../../../utils/buildHierarchy.mjs').HierarchizedEntry}
       */
      const entry = {
        content: {
          children: [
            undefined, // Should be ignored
            {
              type: 'list',
              children: [
                {
                  type: 'listItem',
                  children: [
                    {
                      type: 'paragraph',
                      children: [
                        {
                          type: 'link',
                          url: 'https://mdn-link',
                          children: [
                            {
                              type: 'inlineCode',
                              value: '<number>',
                            },
                          ],
                        },
                        {
                          type: 'text',
                          value: ' | ',
                        },
                        {
                          type: 'link',
                          url: 'https://mdn-link',
                          children: [
                            {
                              type: 'inlineCode',
                              value: '<boolean>',
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      };

      /**
       * @type {import('../../../generated.d.ts').Property}
       */
      const section = {};

      parseType(entry, section);

      assert.deepStrictEqual(section, {
        '@type': ['number', 'boolean'],
      });
    });

    test('{number|boolean[]}', () => {
      /**
       * @type {import('../../../../../utils/buildHierarchy.mjs').HierarchizedEntry}
       */
      const entry = {
        content: {
          children: [
            undefined, // Should be ignored
            {
              type: 'list',
              children: [
                {
                  type: 'listItem',
                  children: [
                    {
                      type: 'paragraph',
                      children: [
                        {
                          type: 'link',
                          url: 'https://mdn-link',
                          children: [
                            {
                              type: 'inlineCode',
                              value: '<number>',
                            },
                          ],
                        },
                        {
                          type: 'text',
                          value: ' | ',
                        },
                        {
                          type: 'link',
                          url: 'https://mdn-link',
                          children: [
                            {
                              type: 'inlineCode',
                              value: '<boolean[]>',
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      };

      /**
       * @type {import('../../../generated.d.ts').Property}
       */
      const section = {};

      parseType(entry, section);

      assert.deepStrictEqual(section, {
        '@type': ['number', 'boolean[]'],
      });
    });

    test('{number} **Default:** 8192', () => {
      /**
       * @type {import('../../../../../utils/buildHierarchy.mjs').HierarchizedEntry}
       */
      const entry = {
        content: {
          children: [
            undefined, // Should be ignored
            {
              type: 'list',
              children: [
                {
                  type: 'listItem',
                  children: [
                    {
                      type: 'paragraph',
                      children: [
                        {
                          type: 'link',
                          url: 'https://mdn-link',
                          children: [
                            {
                              type: 'inlineCode',
                              value: '<number>',
                            },
                          ],
                        },
                        {
                          type: 'text',
                          value: ' ',
                        },
                        {
                          type: 'strong',
                          children: [
                            {
                              type: 'text',
                              value: 'Default:',
                            },
                          ],
                        },
                        {
                          type: 'text',
                          value: ' ',
                        },
                        {
                          type: 'inlineCode',
                          value: '8192',
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      };

      /**
       * @type {import('../../../generated.d.ts').Property}
       */
      const section = {};

      parseType(entry, section);

      assert.deepStrictEqual(section, {
        '@type': 'number',
      });
    });
  });

  describe('Type: <type> [description] [**Default:** `value`]', () => {
    for (const originalType of Object.keys(DOC_TYPE_TO_CORRECT_JS_TYPE_MAP)) {
      const expectedType = DOC_TYPE_TO_CORRECT_JS_TYPE_MAP[originalType];

      test(`'${originalType}' -> '${expectedType}'`, () => {
        /**
         * @type {import('../../../../../utils/buildHierarchy.mjs').HierarchizedEntry}
         */
        const entry = {
          content: {
            children: [
              undefined, // Should be ignored
              {
                type: 'list',
                children: [
                  {
                    type: 'listItem',
                    children: [
                      {
                        type: 'paragraph',
                        children: [
                          {
                            type: 'text',
                            value: 'Type: ',
                          },
                          {
                            type: 'link',
                            url: 'https://mdn-link',
                            children: [
                              {
                                type: 'inlineCode',
                                value: `<${originalType}>`,
                              },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        };

        /**
         * @type {import('../../../generated.d.ts').Property}
         */
        const section = {};

        parseType(entry, section);

        assert.deepStrictEqual(section, {
          '@type': expectedType,
        });
      });
    }

    test('Type: {number}', () => {
      /**
       * @type {import('../../../../../utils/buildHierarchy.mjs').HierarchizedEntry}
       */
      const entry = {
        content: {
          children: [
            undefined, // Should be ignored
            {
              type: 'list',
              children: [
                {
                  type: 'listItem',
                  children: [
                    {
                      type: 'paragraph',
                      children: [
                        {
                          type: 'text',
                          value: 'Type: ',
                        },
                        {
                          type: 'link',
                          url: 'https://mdn-link',
                          children: [
                            {
                              type: 'inlineCode',
                              value: '<number>',
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      };

      /**
       * @type {import('../../../generated.d.ts').Property}
       */
      const section = {};

      parseType(entry, section);

      assert.deepStrictEqual(section, {
        '@type': 'number',
      });
    });

    test('Type: {number[]}', () => {
      /**
       * @type {import('../../../../../utils/buildHierarchy.mjs').HierarchizedEntry}
       */
      const entry = {
        content: {
          children: [
            undefined, // Should be ignored
            {
              type: 'list',
              children: [
                {
                  type: 'listItem',
                  children: [
                    {
                      type: 'paragraph',
                      children: [
                        {
                          type: 'text',
                          value: 'Type: ',
                        },
                        {
                          type: 'link',
                          url: 'https://mdn-link',
                          children: [
                            {
                              type: 'inlineCode',
                              value: '<number[]>',
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      };

      /**
       * @type {import('../../../generated.d.ts').Property}
       */
      const section = {};

      parseType(entry, section);

      assert.deepStrictEqual(section, {
        '@type': 'number[]',
      });
    });

    test('Type: {number|boolean}', () => {
      /**
       * @type {import('../../../../../utils/buildHierarchy.mjs').HierarchizedEntry}
       */
      const entry = {
        content: {
          children: [
            undefined, // Should be ignored
            {
              type: 'list',
              children: [
                {
                  type: 'listItem',
                  children: [
                    {
                      type: 'paragraph',
                      children: [
                        {
                          type: 'text',
                          value: 'Type: ',
                        },
                        {
                          type: 'link',
                          url: 'https://mdn-link',
                          children: [
                            {
                              type: 'inlineCode',
                              value: '<number>',
                            },
                          ],
                        },
                        {
                          type: 'text',
                          value: ' | ',
                        },
                        {
                          type: 'link',
                          url: 'https://mdn-link',
                          children: [
                            {
                              type: 'inlineCode',
                              value: '<boolean>',
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      };

      /**
       * @type {import('../../../generated.d.ts').Property}
       */
      const section = {};

      parseType(entry, section);

      assert.deepStrictEqual(section, {
        '@type': ['number', 'boolean'],
      });
    });

    test('Type: {number|boolean[]}', () => {
      /**
       * @type {import('../../../../../utils/buildHierarchy.mjs').HierarchizedEntry}
       */
      const entry = {
        content: {
          children: [
            undefined, // Should be ignored
            {
              type: 'list',
              children: [
                {
                  type: 'listItem',
                  children: [
                    {
                      type: 'paragraph',
                      children: [
                        {
                          type: 'text',
                          value: 'Type: ',
                        },
                        {
                          type: 'link',
                          url: 'https://mdn-link',
                          children: [
                            {
                              type: 'inlineCode',
                              value: '<number>',
                            },
                          ],
                        },
                        {
                          type: 'text',
                          value: ' | ',
                        },
                        {
                          type: 'link',
                          url: 'https://mdn-link',
                          children: [
                            {
                              type: 'inlineCode',
                              value: '<boolean[]>',
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      };

      /**
       * @type {import('../../../generated.d.ts').Property}
       */
      const section = {};

      parseType(entry, section);

      assert.deepStrictEqual(section, {
        '@type': ['number', 'boolean[]'],
      });
    });

    test('Type: {number} **Default:** 8192', () => {
      /**
       * @type {import('../../../../../utils/buildHierarchy.mjs').HierarchizedEntry}
       */
      const entry = {
        content: {
          children: [
            undefined, // Should be ignored
            {
              type: 'list',
              children: [
                {
                  type: 'listItem',
                  children: [
                    {
                      type: 'paragraph',
                      children: [
                        {
                          type: 'text',
                          value: 'Type: ',
                        },
                        {
                          type: 'link',
                          url: 'https://mdn-link',
                          children: [
                            {
                              type: 'inlineCode',
                              value: '<number>',
                            },
                          ],
                        },
                        {
                          type: 'text',
                          value: ' ',
                        },
                        {
                          type: 'strong',
                          children: [
                            {
                              type: 'text',
                              value: 'Default:',
                            },
                          ],
                        },
                        {
                          type: 'text',
                          value: ' ',
                        },
                        {
                          type: 'inlineCode',
                          value: '8192',
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      };

      /**
       * @type {import('../../../generated.d.ts').Property}
       */
      const section = {};

      parseType(entry, section);

      assert.deepStrictEqual(section, {
        '@type': 'number',
      });
    });
  });
});

describe('parseDescription', () => {
  test('does nothing when given an empty array', () => {
    /**
     * @type {import('mdast').Paragraph}
     */
    const element = { children: [] };

    /**
     * @type {import('../../../generated.d.ts').Property}
     */
    const section = new Proxy(
      {},
      {
        set(_, key) {
          throw new Error(`property '${String(key)}' modified`);
        },
      }
    );

    parseDescription(element, section);
  });

  test('parses descriptions', () => {
    /**
     * @type {import('mdast').Paragraph}
     */
    const element = {
      children: [
        {
          type: 'text',
          value: 'asd1234',
        },
        {
          type: 'link',
          url: 'https://some-link',
          children: [
            {
              type: 'text',
              value: 'asd',
            },
          ],
        },
      ],
    };

    /**
     * @type {import('../../../generated.d.ts').Property}
     */
    const section = {};

    parseDescription(element, section);

    assert.deepStrictEqual(section, {
      description: 'asd1234 [asd](https://some-link)',
    });
  });

  test('determines mutability', () => {
    /**
     * @type {import('mdast').Paragraph}
     */
    const element = {
      children: [
        {
          type: 'text',
          value: 'asd1234',
        },
        {
          type: 'link',
          url: 'https://some-link',
          children: [
            {
              type: 'text',
              value: 'asd',
            },
          ],
        },
        {
          type: 'strong',
          children: [
            {
              type: 'text',
              value: 'Default:',
            },
          ],
        },
        {
          type: 'text',
          value: ' ',
        },
        {
          type: 'inlineCode',
          value: '8192',
        },
      ],
    };

    /**
     * @type {import('../../../generated.d.ts').Property}
     */
    const section = {};

    parseDescription(element, section);

    assert.deepStrictEqual(section, {
      description: 'asd1234 [asd](https://some-link) **Default:**  `8192`',
      mutable: true,
    });
  });
});
