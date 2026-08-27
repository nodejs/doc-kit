'use strict';

import { posix } from 'node:path';

import { relative } from '@doc-kit/core/utils/url.mjs';

import { RELATIVE_URL } from '../constants.mjs';

/**
 * Maps every heading anchor of a module to the chunk page it ends up on.
 * Anchors that are not in the map (the module's introduction) only exist on
 * the full page.
 *
 * @param {Array<{ path: string, entries: Array<import('@doc-kit/core/generators/metadata/types').MetadataEntry> }>} chunks
 * @returns {Map<string, string>} Heading slug → chunk path
 */
export const buildAnchorMap = chunks =>
  new Map(
    chunks.flatMap(({ path, entries }) =>
      entries.map(entry => [entry.heading.data.slug, path])
    )
  );

/**
 * Re-targets a URL that was authored for the module page so it works from a
 * chunk page: a fragment link follows its section to whichever page it landed
 * on, and a relative URL is re-based from the module's directory to the
 * chunk's. Any other URL is returned unchanged.
 *
 * @param {string} url
 * @param {object} options
 * @param {string} options.modulePath - The module page's path (`/fs`)
 * @param {string} options.chunkPath - The chunk page's path (`/fs/readFile`)
 * @param {Map<string, string>} options.anchors - See {@link buildAnchorMap}
 * @returns {string}
 */
export const rewriteUrl = (url, { modulePath, chunkPath, anchors }) => {
  if (url.startsWith('#')) {
    const target = anchors.get(url.slice(1)) ?? modulePath;

    return target === chunkPath
      ? url
      : `${relative(target, chunkPath)}.html${url}`;
  }

  if (RELATIVE_URL.test(url)) {
    return relative(posix.resolve(posix.dirname(modulePath), url), chunkPath);
  }

  return url;
};
