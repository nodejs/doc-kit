'use strict';

import assert from 'node:assert';
import { describe, test } from 'node:test';

import { parseParameters } from '../event.mjs';

describe('parseParameters', () => {
  test('does nothing if the first child is not a list', () => {
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
     * @type {import('../../../generated.d.ts').Event}
     */
    const section = new Proxy(
      {},
      {
        set(_, key) {
          throw new Error(`property '${String(key)}' modified`);
        },
      }
    );

    parseParameters(entry, section);
  });

  describe('`paramName` <type> [description]', () => {
    test('`paramName`', () => {
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
                          type: 'inlineCode',
                          value: 'paramName',
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
       * @type {import('../../../generated.d.ts').Event}
       */
      const section = {};

      parseParameters(entry, section);

      assert.deepStrictEqual(section.parameters, [
        {
          '@name': 'paramName',
          '@type': 'any',
        },
      ]);
    });

    test('`paramName` [<boolean>](https://mdn-link)', () => {
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
                          type: 'inlineCode',
                          value: 'paramName',
                        },
                        {
                          type: 'text',
                          value: ' ',
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
       * @type {import('../../../generated.d.ts').Event}
       */
      const section = {};

      parseParameters(entry, section);

      assert.deepStrictEqual(section.parameters, [
        {
          '@name': 'paramName',
          '@type': 'boolean',
        },
      ]);
    });

    test('`paramName` [<boolean>](https://mdn-link) | [<string>](https://mdn-link)', () => {
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
                          type: 'inlineCode',
                          value: 'paramName',
                        },
                        {
                          type: 'text',
                          value: ' ',
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
                              value: '<string>',
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
       * @type {import('../../../generated.d.ts').Event}
       */
      const section = {};

      parseParameters(entry, section);

      assert.deepStrictEqual(section.parameters, [
        {
          '@name': 'paramName',
          '@type': ['boolean', 'string'],
        },
      ]);
    });

    test('`paramName` [<boolean>](https://mdn-link) description bla bla bla', () => {
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
                          type: 'inlineCode',
                          value: 'paramName',
                        },
                        {
                          type: 'text',
                          value: ' ',
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
                        {
                          type: 'text',
                          value: ' description bla bla bla',
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
       * @type {import('../../../generated.d.ts').Event}
       */
      const section = {};

      parseParameters(entry, section);

      assert.deepStrictEqual(section.parameters, [
        {
          '@name': 'paramName',
          '@type': 'boolean',
          description: 'description bla bla bla',
        },
      ]);
    });

    test('`paramName` {boolean}', () => {
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
                          type: 'inlineCode',
                          value: 'paramName',
                        },
                        {
                          type: 'text',
                          value: ' {boolean}',
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
       * @type {import('../../../generated.d.ts').Event}
       */
      const section = {};

      parseParameters(entry, section);

      assert.deepStrictEqual(section.parameters, [
        {
          '@name': 'paramName',
          '@type': 'boolean',
        },
      ]);
    });

    test('`paramName` {boolean} description bla bla bla', () => {
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
                          type: 'inlineCode',
                          value: 'paramName',
                        },
                        {
                          type: 'text',
                          value: ' {boolean} description bla bla bla',
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
       * @type {import('../../../generated.d.ts').Event}
       */
      const section = {};

      parseParameters(entry, section);

      assert.deepStrictEqual(section.parameters, [
        {
          '@name': 'paramName',
          '@type': 'boolean',
          description: 'description bla bla bla',
        },
      ]);
    });
  });

  describe('Type: <type> [description]', () => {
    test('Type: [<boolean>](https://mdn-link)', () => {
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
       * @type {import('../../../generated.d.ts').Event}
       */
      const section = {};

      parseParameters(entry, section);

      assert.deepStrictEqual(section.parameters, [
        {
          '@name': 'value',
          '@type': 'boolean',
        },
      ]);
    });

    test('Type: [<boolean>](https://mdn-link) | [<string>](https://mdn-link)', () => {
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
                              value: '<boolean>',
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
                              value: '<string>',
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
       * @type {import('../../../generated.d.ts').Event}
       */
      const section = {};

      parseParameters(entry, section);

      assert.deepStrictEqual(section.parameters, [
        {
          '@name': 'value',
          '@type': ['boolean', 'string'],
        },
      ]);
    });

    test('Type: [<boolean>](https://mdn-link) description bla bla bla', () => {
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
                              value: '<boolean>',
                            },
                          ],
                        },
                        {
                          type: 'text',
                          value: ' description bla bla bla',
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
       * @type {import('../../../generated.d.ts').Event}
       */
      const section = {};

      parseParameters(entry, section);

      assert.deepStrictEqual(section.parameters, [
        {
          '@name': 'value',
          '@type': 'boolean',
          description: 'description bla bla bla',
        },
      ]);
    });
  });

  describe('<type> [description]', () => {
    test('[<boolean>](https://mdn-link)', () => {
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
       * @type {import('../../../generated.d.ts').Event}
       */
      const section = {};

      parseParameters(entry, section);

      assert.deepStrictEqual(section.parameters, [
        {
          '@name': 'value',
          '@type': 'boolean',
        },
      ]);
    });

    test('[<boolean>](https://mdn-link) | [<string>](https://mdn-link)', () => {
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
                              value: '<boolean>',
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
                              value: '<string>',
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
       * @type {import('../../../generated.d.ts').Event}
       */
      const section = {};

      parseParameters(entry, section);

      assert.deepStrictEqual(section.parameters, [
        {
          '@name': 'value',
          '@type': ['boolean', 'string'],
        },
      ]);
    });

    test('[<boolean>](https://mdn-link) description bla bla bla', () => {
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
                              value: '<boolean>',
                            },
                          ],
                        },
                        {
                          type: 'text',
                          value: ' description bla bla bla',
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
       * @type {import('../../../generated.d.ts').Event}
       */
      const section = {};

      parseParameters(entry, section);

      assert.deepStrictEqual(section.parameters, [
        {
          '@name': 'value',
          '@type': 'boolean',
          description: 'description bla bla bla',
        },
      ]);
    });
  });
});
