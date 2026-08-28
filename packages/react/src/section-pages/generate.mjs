'use strict';

import getConfig from '@doc-kit/core/utils/configuration/index.mjs';
import { groupNodesByModule } from '@doc-kit/core/utils/generators.mjs';
import { visit } from 'unist-util-visit';

import { MIN_CHUNKS } from './constants.mjs';
import { buildAnchorMap, rewriteUrl } from './utils/links.mjs';
import { createUniqueNamer, toFileName } from './utils/naming.mjs';
import { splitIntoChunks } from './utils/split.mjs';
import { headingLabel } from '../jsx-ast/utils/buildBarProps.mjs';

// The nodes that carry a URL authored relative to the module page
const URL_NODE_TYPES = new Set(['link', 'image', 'definition']);

/**
 * Re-homes a cloned entry on its chunk page, in a single pass over its
 * content: headings are promoted so the chunk's own heading renders as the
 * page title (depth 1) with its sub-sections keeping their relative nesting,
 * and URLs are re-targeted from the module page to the chunk page.
 *
 * @param {import('@doc-kit/core/generators/metadata/types').MetadataEntry} entry - A cloned entry (mutated)
 * @param {number} shift - How many levels to promote headings by
 * @param {Parameters<typeof rewriteUrl>[1]} urls - See {@link rewriteUrl}
 */
const rehome = (entry, shift, urls) => {
  const promoted = new Set();

  /**
   * Shifts one heading node, at most once.
   *
   * @param {import('mdast').Heading} node
   */
  const promote = node => {
    if (!promoted.has(node)) {
      promoted.add(node);
      node.depth = Math.max(1, node.depth - shift);
    }
  };

  promote(entry.heading);

  visit(entry.content, node => {
    if (node.type === 'heading') {
      // The heading also lives in the content tree — usually as the very same
      // node, which must not be shifted twice, but that is not guaranteed.
      promote(node);
    } else if (URL_NODE_TYPES.has(node.type) && node.url) {
      node.url = rewriteUrl(node.url, urls);
    }
  });
};

/**
 * Builds the metadata entries of one chunk page. The originals are left
 * untouched — the full page still needs them — so each entry is cloned and
 * re-homed under the chunk's own `api` and `path`.
 *
 * @param {import('@doc-kit/core/generators/metadata/types').MetadataEntry} module - The module's depth-1 entry
 * @param {import('./types').Chunk} chunk
 * @param {number} index - The chunk's position within the module
 * @param {Map<string, string>} anchors - Where each of the module's anchors lives
 * @returns {Array<import('@doc-kit/core/generators/metadata/types').MetadataEntry>}
 */
const buildChunkEntries = (module, chunk, index, anchors) => {
  const { name, path } = chunk;
  const api = `${module.api}-${name}`;
  const shift = chunk.depth - 1;
  const urls = { modulePath: module.path, chunkPath: path, anchors };

  /** @type {import('@doc-kit/core/generators/metadata/types').ChunkInfo} */
  const info = {
    api: module.api,
    path: module.path,
    slug: chunk.head.heading.data.slug,
    index,
    depth: chunk.depth,
  };

  return chunk.entries.map((original, position) => {
    const entry = structuredClone(original);

    rehome(entry, shift, urls);

    Object.assign(entry, { api, path, basename: name, chunk: info });

    if (position === 0) {
      // The page title and sidebar label
      entry.title = headingLabel(original.heading.data);
      // Version pickers and "Added in" fall back to the module's own version
      entry.introduced_in ??= module.introduced_in;
    }

    return entry;
  });
};

/**
 * Adds per-section chunk pages for every module, next to the full pages.
 *
 * @type {import('./types').Generator['generate']}
 */
export async function generate(input) {
  const { maxDepth, exclude } = getConfig('section-pages');

  const output = [...input];

  for (const entries of groupNodesByModule(input).values()) {
    const module = entries.find(entry => entry.heading.depth === 1);

    if (!module || module.synthetic || exclude.includes(module.api)) {
      continue;
    }

    const chunks = splitIntoChunks(entries, maxDepth);

    if (chunks.length < MIN_CHUNKS) {
      continue;
    }

    // Name every chunk first: links between them need all the paths
    const unique = createUniqueNamer();

    for (const chunk of chunks) {
      const { data } = chunk.head.heading;

      chunk.name = unique(toFileName(headingLabel(data), data, module.api));
      chunk.path = `${module.path}/${chunk.name}`;
    }

    const anchors = buildAnchorMap(chunks);

    chunks.forEach((chunk, index) => {
      output.push(...buildChunkEntries(module, chunk, index, anchors));
    });
  }

  return output;
}
