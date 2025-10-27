// @ts-check
'use strict';

import assert from 'node:assert';
import test, { describe } from 'node:test';

`
#### \`url.username\`

* Type: {string}

Gets and sets the username portion of the URL.
`;

describe('extracts type correctly', () => {
  const supportedFormats = [
    '{integer} **Default:** 8192',
    '{integer|boolean} bla bla bla',
    '{boolean}',
    'Type: {Function} bla bla bla',
  ];

  for (const format of supportedFormats) {
    test(format, () => {
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
            text: '`asd.something`',
            name: '`asd.something`',
            depth: 3,
            slug: '`asd.something`',
            type: 'property',
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
              type: 'list',
              children: [
                {
                  type: 'listItem',
                  children: [
                    {
                      type: 'paragraph',
                      // children:
                    },
                  ],
                },
              ],
            },
          ],
        },
        tags: [],
        yaml_position: {},
      };
    });
  }
});
