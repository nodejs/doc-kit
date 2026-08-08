import getConfig from '@doc-kit/core/utils/configuration/index.mjs';
import { relative } from '@doc-kit/core/utils/url.mjs';

/**
 * Returns an absolute URL (based on baseURL) or a relative URL,
 * depending on the useAbsoluteURLs configuration option.
 *
 * @param {string} to - Target path (e.g., '/fs', '/orama-db.json')
 * @param {string} from - Current page path (e.g., '/api/fs')
 * @returns {string}
 */
export const relativeOrAbsolute = (to, from) => {
  const { useAbsoluteURLs, baseURL } = getConfig('html');

  return useAbsoluteURLs
    ? new URL(`.${to}`, baseURL.replace(/\/?$/, '/')).href
    : relative(to, from);
};
