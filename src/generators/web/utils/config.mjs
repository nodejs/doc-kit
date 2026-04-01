'use strict';

import { LANGS } from '@node-core/rehype-shiki';

import getConfig from '../../../utils/configuration/index.mjs';
import { populate } from '../../../utils/configuration/templates.mjs';
import { getVersionFromSemVer } from '../../../utils/generators.mjs';
import { getSortedHeadNodes } from '../../jsx-ast/utils/getSortedHeadNodes.mjs';

/**
 * Pre-compute version entries with labels and URL templates.
 * Each entry's `url` still contains `{path}` for per-page resolution.
 *
 * @param {object} config
 * @param {string} pageURLBase
 * @returns {Array<{url: string, label: string, major: number}>}
 */
export function buildVersionEntries(config, pageURLBase) {
  return config.changelog.map(({ version, isLts, isCurrent }) => {
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
  const config = getConfig('web');

  const currentVersion = `v${config.version.version}`;
  const templateVars = { ...config, version: currentVersion };

  // Partially populate URL templates: resolve config-level placeholders,
  // leave {path} for per-page resolution by components
  const editURL = populate(config.editURL, templateVars);

  // Resolve the pageURL template once with config-level values, leaving
  // {version} and {path} as the only remaining placeholders
  // eslint-disable-next-line no-unused-vars
  const { version, ...configWithoutVersion } = config;
  const pageURLBase = populate(config.pageURL, configWithoutVersion);

  const versions = buildVersionEntries(config, pageURLBase);
  const pages = buildPageList(input);
  const shikiDisplayNameMap = buildLanguageDisplayNameMap();

  return [
    `export const title = ${JSON.stringify(config.title)};`,
    `export const repository = ${JSON.stringify(config.repository)};`,
    `export const version = ${JSON.stringify(currentVersion)};`,
    `export const versions = ${JSON.stringify(versions)};`,
    `export const editURL = ${JSON.stringify(editURL)};`,
    `export const pages = ${JSON.stringify(pages)};`,
    `export const languageDisplayNameMap = new Map(${JSON.stringify(shikiDisplayNameMap)});`,
  ].join('\n');
}
