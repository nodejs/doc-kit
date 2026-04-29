'use strict';

import { createSyntheticHead, wrapAsEntry } from './synthetic.mjs';

/**
 * Builds the page descriptor for `404.html`
 */
export const buildNotFoundPage = () => {
  const head = createSyntheticHead('404', 'Page Not Found');

  return {
    head,
    entries: [
      wrapAsEntry(head, [
        {
          type: 'paragraph',
          children: [
            {
              type: 'text',
              value:
                'The page you requested could not be found. Use the navigation to find the documentation you are looking for.',
            },
          ],
        },
      ]),
    ],
  };
};
