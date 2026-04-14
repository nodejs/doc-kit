'use strict';

import { LANGS } from '@node-core/rehype-shiki';

import getConfig from '../../../utils/configuration/index.mjs';
import { populate } from '../../../utils/configuration/templates.mjs';
import { getVersionFromSemVer } from '../../../utils/generators.mjs';
import { omitKeys } from '../../../utils/misc.mjs';
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
 * @returns {string} JavaScript source code string with named exports
 */
export default function createConfigSource(input) {
  const { version: configVersion, ...config } = getConfig('web');

  const versionLabel = `v${configVersion.version}`;
  const editURL = populate(config.editURL, {
    ...config,
    version: versionLabel,
  });
  const pageURL = populate(config.pageURL, config);

  const exports = {
    ...omitKeys(
      config,
      // These are keys that are large, and not needed by components, so we ignore them
      ['changelog', 'index', 'imports', 'virtualImports']
    ),
    version: configVersion,
    versions: buildVersionEntries(config.changelog, pageURL),
    editURL,
    pages: buildPageList(input),
  };

  const lines = Object.entries(exports).map(
    ([k, v]) => `export const ${k} = ${JSON.stringify(v)};`
  );

  lines.push(
    `export const languageDisplayNameMap = new Map(${JSON.stringify(buildLanguageDisplayNameMap())});`
  );

  return lines.join('\n');
}
