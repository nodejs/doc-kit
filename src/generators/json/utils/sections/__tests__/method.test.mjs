// @ts-check
'use strict';

import assert from 'node:assert';
import { describe, test } from 'node:test';

import { createMethodSection, parseSignatures } from '../method.mjs';

describe('parseSignatures', () => {
  test('`something.doThing()`', () => {
    /**
     * ### `something.doThing()`
     */

    /**
     * @type {import('../../../../../utils/buildHierarchy.mjs').HierarchizedEntry}
     */
    const entry = {
      heading: {
        data: {
          type: 'classMethod',
          text: '`something.doThing()`',
        },
      },
      content: {
        type: 'root',
        children: [
          undefined, // this should be ignore
        ],
      },
    };

    /**
     * @type {import('../../../generated/generated.d.ts').Method}
     */
    const section = {};

    parseSignatures(entry, section);

    assert.deepStrictEqual(section, {
      signatures: [
        {
          '@returns': { '@type': 'any' },
        },
      ],
    });
  });

  test('`something.doThingWithReturnType()`', () => {
    /**
     * ### `something.doThingWithReturnType()`
     *
     * * Returns: <string>
     */

    /**
     * @type {import('../../../../../utils/buildHierarchy.mjs').HierarchizedEntry}
     */
    const entry = {
      heading: {
        data: {
          type: 'classMethod',
          text: '`something.doThingWithReturnType()`',
        },
      },
      content: {
        type: 'root',
        children: [
          undefined, // this should be ignore
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
                        value: 'Returns: ',
                      },
                      {
                        type: 'link',
                        url: '#some-link',
                        children: [
                          {
                            type: 'inlineCode',
                            value: '<string>',
                          },
                        ],
                      },
                      {
                        type: 'text',
                        value: ' A description bla bla bla',
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
     * @type {import('../../../generated/generated.d.ts').Method}
     */
    const section = {};

    parseSignatures(entry, section);

    assert.deepStrictEqual(section, {
      signatures: [
        {
          '@returns': {
            '@type': 'string',
            description: 'A description bla bla bla',
          },
          parameters: undefined,
        },
      ],
    });
  });

  test('`something.regexExtractedReturnType()`', () => {
    /**
     * ### `something.regexExtractedReturnType()`
     *
     * * this line should be ignored
     * * Returns: {integer} something something something
     */

    /**
     * @type {import('../../../../../utils/buildHierarchy.mjs').HierarchizedEntry}
     */
    const entry = {
      heading: {
        data: {
          type: 'classMethod',
          text: '`something.regexExtractedReturnType()`',
        },
      },
      content: {
        type: 'root',
        children: [
          undefined, // this should be ignore
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
                        value: 'this line should be ignored',
                      },
                    ],
                  },
                ],
              },
              {
                type: 'listItem',
                children: [
                  {
                    type: 'paragraph',
                    children: [
                      {
                        type: 'text',
                        value:
                          'Returns: {integer} something something something',
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
     * @type {import('../../../generated/generated.d.ts').Method}
     */
    const section = {};

    parseSignatures(entry, section);

    assert.deepStrictEqual(section, {
      signatures: [
        {
          '@returns': {
            '@type': 'integer',
            description: 'something something something',
          },
          parameters: undefined,
        },
      ],
    });
  });

  test('`something.doThingWithUndefinedReturnType()`', () => {
    /**
     * ### `something.doThingWithReturnType()`
     *
     * * Returns: `undefined`
     */

    /**
     * @type {import('../../../../../utils/buildHierarchy.mjs').HierarchizedEntry}
     */
    const entry = {
      heading: {
        data: {
          type: 'classMethod',
          text: '`something.doThingWithUndefinedReturnType()`',
        },
      },
      content: {
        type: 'root',
        children: [
          undefined, // this should be ignore
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
                        value: 'Returns: ',
                      },
                      {
                        type: 'inlineCode',
                        value: 'undefined',
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
     * @type {import('../../../generated/generated.d.ts').Method}
     */
    const section = {};

    parseSignatures(entry, section);

    assert.deepStrictEqual(section, {
      signatures: [
        {
          '@returns': {
            '@type': 'undefined',
          },
          parameters: undefined,
        },
      ],
    });
  });

  test('`something.doThingWithoutParameterList(parameter)`', () => {
    /**
     * ### `something.doThingWithoutParameterList()`
     */

    /**
     * @type {import('../../../../../utils/buildHierarchy.mjs').HierarchizedEntry}
     */
    const entry = {
      heading: {
        data: {
          type: 'classMethod',
          text: '`something.doThingWithoutParameterList(parameter)`',
        },
      },
      content: {
        type: 'root',
        children: [
          undefined, // this should be ignore
        ],
      },
    };

    /**
     * @type {import('../../../generated/generated.d.ts').Method}
     */
    const section = {};

    parseSignatures(entry, section);

    assert.deepStrictEqual(section, {
      signatures: [
        {
          '@returns': { '@type': 'any' },
          parameters: [
            {
              '@name': 'parameter',
              '@type': 'any',
              '@default': undefined,
            },
          ],
        },
      ],
    });
  });

  test('`something.doThing(parameter=true, otherParameter=false)`', () => {
    /**
     * ### `something.doThing(parameter=true, otherParameter=false)`
     *
     * * `parameter` <boolean>` A description for it
     * * `otherParameter` <boolean>` A description for it
     */

    /**
     * @type {import('../../../../../utils/buildHierarchy.mjs').HierarchizedEntry}
     */
    const entry = {
      heading: {
        data: {
          type: 'classMethod',
          text: '`something.doThing(parameter=true, otherParameter=false)`',
        },
      },
      content: {
        type: 'root',
        children: [
          undefined, // this should be ignored
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
                        value: 'parameter',
                      },
                      {
                        type: 'text',
                        value: ' ',
                      },
                      {
                        type: 'link',
                        url: '#some-link',
                        children: [
                          {
                            type: 'inlineCode',
                            value: '<boolean>',
                          },
                        ],
                      },
                      {
                        type: 'text',
                        value: ' A description for it',
                      },
                    ],
                  },
                ],
              },
              {
                type: 'listItem',
                children: [
                  {
                    type: 'paragraph',
                    children: [
                      {
                        type: 'inlineCode',
                        value: 'otherParameter',
                      },
                      {
                        type: 'text',
                        value: ' ',
                      },
                      {
                        type: 'link',
                        url: '#some-link',
                        children: [
                          {
                            type: 'inlineCode',
                            value: '<boolean>',
                          },
                        ],
                      },
                      {
                        type: 'text',
                        value: ' A description',
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
     * @type {import('../../../generated/generated.d.ts').Method}
     */
    const section = {};

    parseSignatures(entry, section);

    assert.deepStrictEqual(section, {
      signatures: [
        {
          '@returns': { '@type': 'any' },
          parameters: [
            {
              '@name': 'parameter',
              '@type': 'boolean',
              description: 'A description for it',
              '@default': 'true',
            },
            {
              '@name': 'otherParameter',
              '@type': 'boolean',
              description: 'A description',
              '@default': 'false',
            },
          ],
        },
      ],
    });
  });

  test('Static method: `Something.doThing(parameter)`', () => {
    /**
     * ### Static method: `Something.doThing(parameter)`
     *
     * * `parameter` <ParameterType> A description for it
     */

    /**
     * @type {import('../../../../../utils/buildHierarchy.mjs').HierarchizedEntry}
     */
    const entry = {
      heading: {
        data: {
          type: 'classMethod',
          text: 'Static method: `Something.doThing(parameter)`',
        },
      },
      content: {
        type: 'root',
        children: [
          undefined, // this should be ignored
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
                        value: 'parameter',
                      },
                      {
                        type: 'text',
                        value: ' ',
                      },
                      {
                        type: 'link',
                        url: '#some-link',
                        children: [
                          {
                            type: 'inlineCode',
                            value: '<ParameterType>',
                          },
                        ],
                      },
                      {
                        type: 'text',
                        value: ' A description for it',
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
     * @type {import('../../../generated/generated.d.ts').Method}
     */
    const section = {};

    parseSignatures(entry, section);

    assert.deepStrictEqual(section, {
      signatures: [
        {
          '@returns': { '@type': 'any' },
          parameters: [
            {
              '@name': 'parameter',
              '@type': 'ParameterType',
              description: 'A description for it',
            },
          ],
        },
      ],
    });
  });

  test('`new Something()`', () => {
    /**
     * ### Static method: `Something.doThing(parameter)`
     *
     * * `parameter` <ParameterType> A description for it
     */

    /**
     * @type {import('../../../../../utils/buildHierarchy.mjs').HierarchizedEntry}
     */
    const entry = {
      heading: {
        data: {
          type: 'classMethod',
          text: '`new Something()`',
        },
      },
      content: {
        type: 'root',
        children: [
          undefined, // this should be ignored
        ],
      },
    };

    /**
     * @type {import('../../../generated/generated.d.ts').Method}
     */
    const section = {};

    parseSignatures(entry, section);

    assert.deepStrictEqual(section, {
      signatures: [
        {
          '@returns': { '@type': 'any' },
        },
      ],
    });
  });
});

describe('createMethodSection', () => {
  describe('pushes method section to correct property on parent section', () => {
    test('@constructor', () => {
      /**
       * @type {import('../../../../../utils/buildHierarchy.mjs').HierarchizedEntry}
       */
      const entry = {
        heading: {
          data: {
            type: 'ctor',
            text: 'new Something()',
          },
        },
        content: {
          children: [],
        },
      };

      /**
       * @type {import('../../../generated/generated.d.ts').Class}
       */
      const parent = {
        type: 'class',
      };

      /**
       * @type {import('../../../generated/generated.d.ts').Method}
       */
      const section = {
        parent,
      };

      createMethodSection(entry, section);

      assert.deepStrictEqual(parent['@constructor'], [section]);
      assert.strictEqual(parent.staticMethods, undefined);
      assert.strictEqual(parent.methods, undefined);
    });

    test('staticMethods', () => {
      /**
       * @type {import('../../../../../utils/buildHierarchy.mjs').HierarchizedEntry}
       */
      const entry = {
        heading: {
          data: {
            type: 'classMethod',
            text: 'Static method: something.doSomething()',
          },
        },
        content: {
          children: [],
        },
      };

      /**
       * @type {import('../../../generated/generated.d.ts').Class}
       */
      const parent = {
        type: 'class',
      };

      /**
       * @type {import('../../../generated/generated.d.ts').Method}
       */
      const section = {
        parent,
      };

      createMethodSection(entry, section);

      assert.strictEqual(parent['@constructor'], undefined);
      assert.deepStrictEqual(parent.staticMethods, [section]);
      assert.strictEqual(parent.methods, undefined);
    });

    test('methods', () => {
      /**
       * @type {import('../../../../../utils/buildHierarchy.mjs').HierarchizedEntry}
       */
      const entry = {
        heading: {
          data: {
            type: 'classMethod',
            text: 'something.doSomething()',
          },
        },
        content: {
          children: [],
        },
      };

      /**
       * @type {import('../../../generated/generated.d.ts').Class}
       */
      const parent = {
        type: 'class',
      };

      /**
       * @type {import('../../../generated/generated.d.ts').Method}
       */
      const section = {
        parent,
      };

      createMethodSection(entry, section);

      assert.strictEqual(parent['@constructor'], undefined);
      assert.strictEqual(parent.staticMethods, undefined);
      assert.deepStrictEqual(parent.methods, [section]);
    });
  });
});
