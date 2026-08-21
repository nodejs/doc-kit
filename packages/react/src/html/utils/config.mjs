'use strict';

import getConfig from '@doc-kit/core/utils/configuration/index.mjs';
import { populate } from '@doc-kit/core/utils/configuration/templates.mjs';
import {
  getEntryDescription,
  getVersionFromSemVer,
} from '@doc-kit/core/utils/generators.mjs';
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
 * @param {Array<import('../../jsx-ast/utils/buildContent.mjs').JSXContent>} input
 * @returns {Array<[string, string]>}
 */
export function buildPageList(input) {
  const headNodes = getSortedHeadNodes(input.map(e => e.data));
  return headNodes.map(node => [node.heading.data.name, node.path]);
}

/**
 * Pre-compute the entries rendered by the `<DocumentationIndex />` component:
 * every page with a stability index, plus its description.
 *
 * @param {Array<import('../../jsx-ast/utils/buildContent.mjs').JSXContent>} input
 * @returns {Array<{api: string, name: string, index: string, description: string}>}
 */
export function buildDocumentationIndex(input) {
  return getSortedHeadNodes(input.map(e => e.data))
    .filter(entry => entry.stability)
    .map(entry => ({
      api: entry.api,
      name: entry.heading.data.name,
      index: entry.stability.data.index,
      description: getEntryDescription(entry),
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
 * @param {Array<import('../../jsx-ast/utils/buildContent.mjs').JSXContent>} input - JSX AST entries with .data metadata
 * @param {boolean} [server=false] - Whether the module is for the server build.
 * @returns {string} JavaScript source code string with named exports
 */
export default function createConfigSource(input, server = false) {
  const { version: configVersion, ...config } = getConfig('html');

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
    pages: buildPageList(input),
    documentationIndex: buildDocumentationIndex(input),
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
