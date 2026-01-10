// @ts-check
import assert from 'node:assert';
import { describe, test } from 'node:test';

import { parseParameterList } from '../parseParameterList.mjs';

describe('parseParameterList', () => {
  describe('<type> [description] [**Default:** `value`]', () => {
    test('{number}', () => {
      /**
       * @type {import('mdast').List}
       */
      const list = {
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
      };

      const parameters = parseParameterList(list);

      assert.deepStrictEqual(parameters, [{ type: ['number'] }]);
    });

    test('{number[]}', () => {
      /**
       * @type {import('mdast').List}
       */
      const list = {
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
      };

      const parameters = parseParameterList(list);

      assert.deepStrictEqual(parameters, [{ type: ['number[]'] }]);
    });

    test('{number[]|boolean}', () => {
      /**
       * @type {import('mdast').List}
       */
      const list = {
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
      };

      const parameters = parseParameterList(list);

      assert.deepStrictEqual(parameters, [{ type: ['number[]', 'boolean'] }]);
    });

    test('{object} some decription bla bla bla', () => {
      /**
       * @type {import('mdast').List}
       */
      const list = {
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
                        value: '<object>',
                      },
                    ],
                  },
                  {
                    type: 'text',
                    value: ' some description bla bla bla',
                  },
                ],
              },
            ],
          },
        ],
      };

      const parameters = parseParameterList(list);

      assert.deepStrictEqual(parameters, [
        { type: ['object'], description: 'some description bla bla bla' },
      ]);
    });

    test('{string} some decription bla bla bla **Default:** `123`', () => {
      /**
       * @type {import('mdast').List}
       */
      const list = {
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
                        value: '<string>',
                      },
                    ],
                  },
                  {
                    type: 'text',
                    value: ' some description bla bla bla ',
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
                    value: '123',
                  },
                ],
              },
            ],
          },
        ],
      };

      const parameters = parseParameterList(list);

      assert.deepStrictEqual(parameters, [
        {
          type: ['string'],
          description: 'some description bla bla bla **Default:** `123`',
          hasDefaultValue: true,
        },
      ]);
    });
  });

  describe('Type: <type> [description] [**Default:** `value`]', () => {
    test('Type: Type: {number}', () => {
      /**
       * @type {import('mdast').List}
       */
      const list = {
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
      };

      const parameters = parseParameterList(list);

      assert.deepStrictEqual(parameters, [{ type: ['number'] }]);
    });

    test('Type: {number[]}', () => {
      /**
       * @type {import('mdast').List}
       */
      const list = {
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
      };

      const parameters = parseParameterList(list);

      assert.deepStrictEqual(parameters, [{ type: ['number[]'] }]);
    });

    test('Type: {number[]|boolean}', () => {
      /**
       * @type {import('mdast').List}
       */
      const list = {
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
      };

      const parameters = parseParameterList(list);

      assert.deepStrictEqual(parameters, [{ type: ['number[]', 'boolean'] }]);
    });

    test('Type: {object} some decription bla bla bla', () => {
      /**
       * @type {import('mdast').List}
       */
      const list = {
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
                        value: '<object>',
                      },
                    ],
                  },
                  {
                    type: 'text',
                    value: ' some description bla bla bla',
                  },
                ],
              },
            ],
          },
        ],
      };

      const parameters = parseParameterList(list);

      assert.deepStrictEqual(parameters, [
        { type: ['object'], description: 'some description bla bla bla' },
      ]);
    });

    test('Type: {string} some decription bla bla bla **Default:** `123`', () => {
      /**
       * @type {import('mdast').List}
       */
      const list = {
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
                        value: '<string>',
                      },
                    ],
                  },
                  {
                    type: 'text',
                    value: ' some description bla bla bla ',
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
                    value: '123',
                  },
                ],
              },
            ],
          },
        ],
      };

      const parameters = parseParameterList(list);

      assert.deepStrictEqual(parameters, [
        {
          type: ['string'],
          description: 'some description bla bla bla **Default:** `123`',
          hasDefaultValue: true,
        },
      ]);
    });
  });

  describe('Returns: <type> [description] [**Default:** `value`]', () => {
    test('Returns: {number}', () => {
      /**
       * @type {import('mdast').List}
       */
      const list = {
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
      };

      const parameters = parseParameterList(list);

      assert.deepStrictEqual(parameters, [
        { type: ['number'], isReturnType: true },
      ]);
    });

    test('Returns: {number[]}', () => {
      /**
       * @type {import('mdast').List}
       */
      const list = {
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
      };

      const parameters = parseParameterList(list);

      assert.deepStrictEqual(parameters, [
        { type: ['number[]'], isReturnType: true },
      ]);
    });

    test('Returns: {number[]|boolean}', () => {
      /**
       * @type {import('mdast').List}
       */
      const list = {
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
                    url: 'https://mdn-link',
                    children: [
                      {
                        type: 'inlineCode',
                        value: '<number[]>',
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
      };

      const parameters = parseParameterList(list);

      assert.deepStrictEqual(parameters, [
        { type: ['number[]', 'boolean'], isReturnType: true },
      ]);
    });

    test('Returns: {object} some decription bla bla bla', () => {
      /**
       * @type {import('mdast').List}
       */
      const list = {
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
                    url: 'https://mdn-link',
                    children: [
                      {
                        type: 'inlineCode',
                        value: '<object>',
                      },
                    ],
                  },
                  {
                    type: 'text',
                    value: ' some description bla bla bla',
                  },
                ],
              },
            ],
          },
        ],
      };

      const parameters = parseParameterList(list);

      assert.deepStrictEqual(parameters, [
        {
          type: ['object'],
          description: 'some description bla bla bla',
          isReturnType: true,
        },
      ]);
    });
  });

  describe('<name> <type> [description] [**Default:** `value`]', () => {
    test('`parameter` {number}', () => {
      /**
       * @type {import('mdast').List}
       */
      const list = {
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
      };

      const parameters = parseParameterList(list);

      assert.deepStrictEqual(parameters, [
        {
          name: 'parameter',
          type: ['number'],
        },
      ]);
    });

    test('`parameter` {number[]}', () => {
      /**
       * @type {import('mdast').List}
       */
      const list = {
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
      };

      const parameters = parseParameterList(list);

      assert.deepStrictEqual(parameters, [
        {
          name: 'parameter',
          type: ['number[]'],
        },
      ]);
    });

    test('`parameter` {number[]|boolean}', () => {
      /**
       * @type {import('mdast').List}
       */
      const list = {
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
                    url: 'https://mdn-link',
                    children: [
                      {
                        type: 'inlineCode',
                        value: '<number[]>',
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
      };

      const parameters = parseParameterList(list);

      assert.deepStrictEqual(parameters, [
        {
          name: 'parameter',
          type: ['number[]', 'boolean'],
        },
      ]);
    });

    test('`parameter` {object} some decription bla bla bla', () => {
      /**
       * @type {import('mdast').List}
       */
      const list = {
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
                    url: 'https://mdn-link',
                    children: [
                      {
                        type: 'inlineCode',
                        value: '<object>',
                      },
                    ],
                  },
                  {
                    type: 'text',
                    value: ' some description bla bla bla',
                  },
                ],
              },
            ],
          },
        ],
      };

      const parameters = parseParameterList(list);

      assert.deepStrictEqual(parameters, [
        {
          name: 'parameter',
          type: ['object'],
          description: 'some description bla bla bla',
        },
      ]);
    });

    test('`parameter` {string} some decription bla bla bla **Default:** `123`', () => {
      /**
       * @type {import('mdast').List}
       */
      const list = {
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
                    url: 'https://mdn-link',
                    children: [
                      {
                        type: 'inlineCode',
                        value: '<string>',
                      },
                    ],
                  },
                  {
                    type: 'text',
                    value: ' some description bla bla bla ',
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
                    value: '123',
                  },
                ],
              },
            ],
          },
        ],
      };

      const parameters = parseParameterList(list);

      assert.deepStrictEqual(parameters, [
        {
          name: 'parameter',
          type: ['string'],
          description: 'some description bla bla bla **Default:** `123`',
          hasDefaultValue: true,
        },
      ]);
    });
  });

  test('one of all', () => {
    /**
     * @type {import('mdast').List}
     */
    const list = {
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
                      value: '<string>',
                    },
                  ],
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
                  value: 'Returns: ',
                },
                {
                  type: 'link',
                  url: 'https://mdn-link',
                  children: [
                    {
                      type: 'inlineCode',
                      value: '<object>',
                    },
                  ],
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
                  value: 'parameter',
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
                      value: '<number>',
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };

    const parameters = parseParameterList(list);

    assert.deepStrictEqual(parameters, [
      { type: ['number'] },
      { type: ['string'] },
      { type: ['object'], isReturnType: true },
      { name: 'parameter', type: ['number'] },
    ]);
  });
});
