'use strict';

import { endianness } from 'node:os';

import { LANGS } from '@node-core/rehype-shiki';
import createSyntaxHighlighter from '@node-core/rehype-shiki/highlighter';
import { bundledThemes } from 'shiki/themes';

import { importFromURL } from '#utils/loaders.mjs';
import { getMarkdownPlugins } from '#utils/markdown/plugins.mjs';

/**
 * A syntax highlighter, creating its Shiki instance on first use.
 *
 * @typedef {Object} SyntaxHighlighter
 * @property {import('shiki').HighlighterCore} shiki - The Shiki instance
 * @property {(languageId?: string) => string} resolveLanguage - Resolves a language, falling back to plain text for unknown ones
 * @property {(code: string, lang: string, meta?: Record<string, unknown>) => string} highlightToHtml - Highlights code, returning the inner HTML of its `<code>` element
 * @property {(code: string, lang: string, meta?: Record<string, unknown>) => ReturnType<import('shiki').HighlighterCore['codeToHast']>} highlightToHast - Highlights code, returning a HAST tree
 * @property {Array<import('shiki').LanguageRegistration>} langs - The languages it highlights
 */

/**
 * Creates Shiki's regular expression engine: the wasm (Oniguruma) one where
 * it can, the JavaScript one otherwise.
 *
 * @returns {Promise<import('shiki').RegexEngine>}
 */
const createEngine = async () => {
  // riscv64 with sv39 has limited virtual memory space, where creating
  // too many (>20) wasm memory instances fails.
  // https://github.com/nodejs/node/pull/60591
  //
  // The wasm highlighter is currently not compatible with big endian.
  // https://github.com/nodejs/node/pull/62512#issuecomment-4243469950
  if (process.arch !== 'riscv64' && endianness() === 'LE') {
    const { createOnigurumaEngine } = await import('shiki/engine/oniguruma');

    return createOnigurumaEngine(import('shiki/wasm'));
  }

  const { createJavaScriptRegexEngine } =
    await import('shiki/engine/javascript');

  // Not every bundled grammar compiles under the JavaScript engine,
  // so skip the patterns it cannot handle instead of throwing.
  return createJavaScriptRegexEngine({ forgiving: true });
};

// The regular expression engine of this thread, for all its highlighters
let engine;

// The highlighters of the options given, by their JSON
const highlighters = new Map();

/**
 * Imports a list of options, each given as it is, or as a module (a path
 * relative to the working directory, or a URL) default-exporting it, or a list
 * of them.
 *
 * @template T
 * @param {Array<string | T>} options - The options
 * @returns {Promise<Array<T>>}
 */
const importList = async options => {
  const imported = [];

  for (const option of options) {
    if (typeof option === 'string') {
      imported.push(await importFromURL(option));
    } else {
      imported.push(option);
    }
  }

  return imported.flat();
};

/**
 * Imports a theme: the name of one Shiki bundles, a module default-exporting
 * one, or the theme itself. Shiki tells themes apart by their name, so a theme
 * without one is named after its color scheme.
 *
 * @param {string | import('shiki').ThemeRegistration} theme - The theme
 * @param {'light' | 'dark'} scheme - Its color scheme
 * @returns {Promise<import('shiki').ThemeRegistration>}
 */
const importTheme = async (theme, scheme) => {
  let imported = theme;

  if (typeof theme === 'string') {
    if (theme in bundledThemes) {
      imported = (await bundledThemes[theme]()).default;
    } else {
      imported = await importFromURL(theme);
    }
  }

  return { name: `custom-${scheme}`, ...imported };
};

/**
 * Imports the options of a highlighter, and creates it.
 *
 * @param {import('./rehype.mjs').ShikiOptions} options - The options
 * @returns {Promise<SyntaxHighlighter>}
 */
const importHighlighter = async ({
  langs = [],
  langAlias = {},
  themes,
  transformers = [],
}) => {
  engine ??= createEngine();

  const coreOptions = {
    engine: await engine,
    langs: [...LANGS, ...(await importList(langs))],
    // A copy, as Shiki adds the aliases of the languages it bundles to it
    langAlias: { ...langAlias },
  };

  const highlighterOptions = {
    transformers: await importList(transformers),
  };

  // Without themes of its own, the highlighter has a default light and dark one
  if (themes) {
    const light = await importTheme(themes.light, 'light');
    const dark = await importTheme(themes.dark, 'dark');

    coreOptions.themes = [light, dark];
    highlighterOptions.themes = { light: light.name, dark: dark.name };
    highlighterOptions.defaultColor = 'light';
  }

  let highlighter;

  /**
   * Gives the Shiki highlighter, creating it on first use.
   */
  const current = () =>
    (highlighter ??= createSyntaxHighlighter({
      coreOptions,
      highlighterOptions,
    }));

  return {
    langs: coreOptions.langs,

    /**
     * The Shiki instance.
     */
    get shiki() {
      return current().shiki;
    },

    /**
     * Resolves a language, falling back to plain text for unknown ones.
     *
     * @param {string} [languageId]
     */
    resolveLanguage: languageId => current().resolveLanguage(languageId),

    /**
     * Highlights code, returning the inner HTML of its `<code>` element.
     *
     * @param {...any} args - The code, its language, and its metadata
     */
    highlightToHtml: (...args) => current().highlightToHtml(...args),

    /**
     * Highlights code, returning a HAST tree.
     *
     * @param {...any} args - The code, its language, and its metadata
     */
    highlightToHast: (...args) => current().highlightToHast(...args),
  };
};

/**
 * Creates a highlighter of every language Shiki bundles, with the given
 * options (see `./rehype.mjs`). Its Shiki instance is created on first use,
 * and the same options give the same highlighter.
 *
 * @param {import('./rehype.mjs').ShikiOptions} [options] - The options
 * @returns {Promise<SyntaxHighlighter>}
 */
export const createHighlighter = (options = {}) => {
  const key = JSON.stringify(options);

  if (!highlighters.has(key)) {
    highlighters.set(key, importHighlighter(options));
  }

  return highlighters.get(key);
};

/**
 * Gets the highlighter of the Shiki plugin of a generator's Markdown pipeline,
 * as loaded on the current thread, to highlight code as the pipeline does.
 *
 * @param {string} generator - The name of the generator
 * @returns {SyntaxHighlighter}
 */
export const getHighlighter = generator => {
  const shiki = getMarkdownPlugins(generator).rehypePlugins.find(
    plugin => Array.isArray(plugin) && plugin[0].highlighter
  );

  if (!shiki) {
    throw new Error(
      `The Markdown pipeline of "${generator}" does not highlight code`
    );
  }

  return shiki[0].highlighter;
};
