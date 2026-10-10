'use strict';

import rehypeShikiji from '@node-core/rehype-shiki/plugin';

import { createHighlighter } from './highlighter.mjs';

/**
 * The options of the Shiki plugin. Its modules are paths relative to the
 * working directory, or URLs.
 *
 * @typedef {Object} ShikiOptions
 * @property {Array<string | import('shiki').LanguageRegistration>} [langs] - More languages: grammars, or modules default-exporting grammars
 * @property {Record<string, string>} [langAlias] - Aliases of languages, e.g. `{ conf: 'ini' }`
 * @property {{ light: string | import('shiki').ThemeRegistration, dark: string | import('shiki').ThemeRegistration }} [themes] - The light and dark themes: names of themes Shiki bundles, modules default-exporting themes, or themes
 * @property {Array<string>} [transformers] - Modules default-exporting Shiki transformers, or lists of them
 */

/**
 * Loads the rehype plugin highlighting code blocks with Shiki, in every
 * language it bundles. The plugin exposes its highlighter as `highlighter`
 * (see `getHighlighter`).
 *
 * @param {ShikiOptions} [options] - The options
 * @returns {Promise<import('unified').Plugin & { highlighter: import('./highlighter.mjs').SyntaxHighlighter }>}
 */
export async function load(options) {
  const highlighter = await createHighlighter(options);
  const transformer = await rehypeShikiji({ highlighter });

  /**
   * Highlights the code blocks of a tree.
   */
  const shiki = () => transformer;

  shiki.highlighter = highlighter;

  return shiki;
}
