'use strict';

import { createSyntheticHead, wrapAsEntry } from './synthetic.mjs';

/**
 * Default configuration for the synthetic `404.html` page. Re-exported so the
 * `jsx-ast` generator's `defaultConfiguration` can reuse the same values
 * instead of duplicating them.
 */
export const NOT_FOUND_DEFAULTS = {
  notFoundText:
    'The page you requested could not be found. Use the navigation to find the documentation you are looking for, or return to the ',
  notFoundLinkUrl: 'index.html',
  notFoundLinkText: 'API index',
};

/**
 * Builds the page descriptor for `404.html`
 *
 * @param {Partial<Pick<import('../../types').Generator['defaultConfiguration'], 'notFoundText' | 'notFoundLinkUrl' | 'notFoundLinkText'>>} config
 */
export const buildNotFoundPage = (config = {}) => {
  const {
    notFoundText = NOT_FOUND_DEFAULTS.notFoundText,
    notFoundLinkUrl = NOT_FOUND_DEFAULTS.notFoundLinkUrl,
    notFoundLinkText = NOT_FOUND_DEFAULTS.notFoundLinkText,
  } = config;

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
              value: notFoundText,
            },
            {
              type: 'link',
              url: notFoundLinkUrl,
              children: [{ type: 'text', value: notFoundLinkText }],
            },
            {
              type: 'text',
              value: '.',
            },
          ],
        },
      ]),
    ],
  };
};
