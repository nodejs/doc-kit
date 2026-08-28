'use strict';

import getConfig from '@doc-kit/core/utils/configuration/index.mjs';
import { populate } from '@doc-kit/core/utils/configuration/templates.mjs';
import {
  getEntryDescription,
  getVersionFromSemVer,
} from '@doc-kit/core/utils/generators.mjs';
import { parseInline, renderAsHTML } from '@doc-kit/core/utils/inline.mjs';
import { omitKeys } from '@doc-kit/core/utils/misc.mjs';
import { LANGS } from '@node-core/rehype-shiki';

import { getSortedHeadNodes } from '../../jsx-ast/utils/getSortedHeadNodes.mjs';

/**
 * Pre-compute version entries with labels and URL templates.
 * Each entry's `url` still contains `{path}` for per-page resolution.
 *
 * @param {object} changelog
 * @param {string} pageURLBase
 * @returns {Array<{url: string, label: string, major: number}>}
 */
export function buildVersionEntries(changelog, pageURLBase) {
  return changelog.map(({ version, isLts, isCurrent }) => {
    let label = `v${getVersionFromSemVer(version)}`;
    const url = pageURLBase.replace('{version}', label);
    if (isLts) {
      label += ' (LTS)';
    }
    if (isCurrent) {
      label += ' (Current)';
    }
    return { url, label, major: version.major };
  });
}

/**
 * Pre-compute sorted page list for sidebar navigation.
 *
 * @param {Array<import('@doc-kit/core/generators/metadata/types').MetadataEntry>} input
 * @returns {Array<[string, string]>}
 */
export function buildPageList(input) {
  const headNodes = getSortedHeadNodes(input);
  return headNodes.map(node => [node.heading.data.name, node.path]);
}

/**
 * Nests a document-ordered list of sections by their heading depth.
 *
 * @template {{ depth: number }} T
 * @param {Array<T>} sections
 * @returns {Array<Omit<T, 'depth'> & { items?: Array }>}
 */
const toTree = sections => {
  const root = { items: [] };
  const stack = [{ depth: 1, node: root }];

  for (const { depth, ...section } of sections) {
    while (stack.at(-1).depth >= depth) {
      stack.pop();
    }

    (stack.at(-1).node.items ??= []).push(section);
    stack.push({ depth, node: section });
  }

  return root.items;
};

/**
 * Pre-compute the per-module section trees (see the `section-pages` generator):
 * each module page's path maps to its label and its chunk pages, nested by
 * heading depth and in document order, for the sidebar's section list and the
 * previous/next links.
 *
 * @param {Array<import('@doc-kit/core/generators/metadata/types').MetadataEntry>} input
 * @returns {Record<string, {label: string, items: Array<{label: string, path: string, items?: Array}>}>}
 */
export function buildChunkGroups(input) {
  const labels = new Map(
    input.map(entry => [entry.path, entry.heading.data.name])
  );

  const groups = {};

  for (const entry of input) {
    if (!entry.chunk) {
      continue;
    }

    const group = (groups[entry.chunk.path] ??= {
      label: labels.get(entry.chunk.path) ?? entry.chunk.api,
      items: [],
    });

    group.items.push({
      label: entry.title ?? entry.heading.data.name,
      path: entry.path,
      depth: entry.chunk.depth,
      index: entry.chunk.index,
    });
  }

  // Pages arrive in render (completion) order, not document order
  for (const group of Object.values(groups)) {
    group.items = toTree(
      group.items
        .toSorted((a, b) => a.index - b.index)
        .map(({ label, path, depth }) => ({ label, path, depth }))
    );
  }

  return groups;
}

/**
 * Pre-compute the entries rendered by the `<DocumentationIndex />` component:
 * every page with a stability index, plus its description.
 *
 * @param {Array<import('@doc-kit/core/generators/metadata/types').MetadataEntry>} input
 * @returns {Array<{api: string, name: string, index: string, description: string}>}
 */
export function buildDocumentationIndex(input) {
  return getSortedHeadNodes(input)
    .filter(entry => entry.stability)
    .map(entry => ({
      api: entry.api,
      name: entry.heading.data.name,
      index: entry.stability.data.index,
      description: renderAsHTML(parseInline(getEntryDescription(entry), true)),
    }));
}

/**
 * Pre-compute Shiki language display name map entries.
 *
 * @returns {Array<[string[], string]>}
 */
export function buildLanguageDisplayNameMap() {
  return [
    ...new Map(
      LANGS.map(({ name, aliases = [], displayName }) => [
        name,
        [[...aliases, name], displayName],
      ])
    ).values(),
  ];
}

/**
 * Generates the JavaScript source code for the `#theme/config` virtual module.
 *
 * This module exposes web configuration and pre-computed build-time data as
 * named exports so that UI components can import only what they need, and
 * tree-shaking removes the rest.
 *
 * Values are pre-populated as much as possible at build time to minimize
 * client-side computation. For example, version entries include their
 * display labels and URL templates (with only `{path}` remaining for
 * per-page resolution by components).
 *
 * @param {Array<import('@doc-kit/core/generators/metadata/types').MetadataEntry>} input - Per-page metadata
 * @param {boolean} [server=false] - Whether the module is for the server build.
 * @returns {string} JavaScript source code string with named exports
 */
export default function createConfigSource(input, server = false) {
  const { version: configVersion, ...config } = getConfig('html');

  // Only the real module pages are listed in the sidebar and the index;
  // synthetic pages (`all`, `404`) and chunk pages are reachable elsewhere.
  const pages = input.filter(entry => !entry.synthetic && !entry.chunk);

  const editURL =
    config.editURL &&
    populate(config.editURL, {
      ...config,
      version: `v${configVersion.version}`,
    });
  const pageURL = populate(config.pageURL, config);

  const exports = {
    repository: undefined,
    baseURL: undefined,
    remoteConfigUrl: undefined,
    ...omitKeys(
      config,
      // These are large or build-time-only keys, or may contain functions, so
      // they are never exposed to client components.
      [
        'changelog',
        'index',
        'imports',
        'virtualImports',
        'stylesheets',
        'components',
        'head',
        'bundler',
      ]
    ),
    version: configVersion,
    versions: buildVersionEntries(config.changelog, pageURL),
    editURL,
    pages: buildPageList(pages),
    documentationIndex: buildDocumentationIndex(pages),
    chunks: buildChunkGroups(input),
    server,
  };

  const lines = Object.entries(exports).map(
    ([k, v]) => `export const ${k} = ${JSON.stringify(v)};`
  );

  lines.push(
    `export const languageDisplayNameMap = new Map(${JSON.stringify(buildLanguageDisplayNameMap())});`
  );

  return lines.join('\n');
}
