import { relative } from '../../../../utils/url.mjs';

import { useAbsoluteURLs, baseURL } from '#theme/config';

/**
 * Returns an absolute URL (based on baseURL) or a relative URL,
 * depending on the useAbsoluteURLs configuration option.
 *
 * @param {string} to - Target path (e.g., '/fs', '/orama-db.json')
 * @param {string} from - Current page path (e.g., '/api/fs')
 * @returns {string}
 */
export const relativeOrAbsolute = (to, from) =>
  useAbsoluteURLs
    ? new URL(`.${to}`, baseURL.replace(/\/?$/, '/')).href
    : relative(to, from);
