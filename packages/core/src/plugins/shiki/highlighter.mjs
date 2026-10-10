'use strict';

import { createRequire } from 'node:module';
import { endianness } from 'node:os';

import createSyntaxHighlighter from '@node-core/rehype-shiki/highlighter';
import { isSpecialLang } from 'shiki/core';
import { bundledLanguagesInfo } from 'shiki/langs';
import { bundledThemes } from 'shiki/themes';

import { importFromURL } from '#utils/loaders.mjs';
import { getMarkdownPlugins } from '#utils/markdown/plugins.mjs';

const require = createRequire(import.meta.url);

/**
 * A language a highlighter highlights.
 *
 * @typedef {Pick<import('shiki').LanguageRegistration, 'name' | 'displayName' | 'aliases'>} Language
 */

/**
 * A syntax highlighter, creating its Shiki instance on first use.
 *
 * @typedef {Object} SyntaxHighlighter
 * @property {import('shiki').HighlighterCore} shiki - The Shiki instance
 * @property {(languageId?: string) => string} resolveLanguage - Resolves a language, falling back to plain text for unknown ones
 * @property {(code: string, lang: string, meta?: Record<string, unknown>) => string} highlightToHtml - Highlights code, returning the inner HTML of its `<code>` element
 * @property {(code: string, lang: string, meta?: Record<string, unknown>) => ReturnType<import('shiki').HighlighterCore['codeToHast']>} highlightToHast - Highlights code, returning a HAST tree
 * @property {Array<Language>} langs - The languages it highlights
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

// What code in an unknown language is highlighted as
const FALLBACK_LANGUAGE = 'text';

// The languages Shiki bundles. Registering a grammar takes time and memory,
// and slows down every highlight after it, so each one is only imported and
// registered once code in it is highlighted (see `resolveLanguage`).
const BUNDLED_LANGUAGES = bundledLanguagesInfo.map(({ id, name, aliases }) => ({
  name: id,
  displayName: name,
  aliases,
}));

// The bundled language each of their names and aliases stands for, as code
// names its language by either
const BUNDLED_NAMES = new Map(
  BUNDLED_LANGUAGES.flatMap(({ name, aliases = [] }) =>
    [name, ...aliases].map(alias => [alias, name])
  )
);

/**
 * Imports a bundled language: its grammar, and those of the languages it
 * embeds.
 *
 * @param {string} name - A name or alias of the language
 * @returns {Array<import('shiki').LanguageRegistration>}
 */
const importBundledLanguage = name =>
  require(`shiki/langs/${BUNDLED_NAMES.get(name)}.mjs`).default;

/**
 * Adds the bundled languages that languages embed, which Shiki registers
 * along with them.
 *
 * @param {Array<import('shiki').LanguageRegistration>} langs - The languages
 * @returns {Array<import('shiki').LanguageRegistration>}
 */
const withEmbeddedLanguages = langs => {
  const names = new Set(langs.map(({ name }) => name));

  const embedded = langs
    .flatMap(({ embeddedLangs = [] }) => embeddedLangs)
    .filter(name => !names.has(name) && BUNDLED_NAMES.has(name))
    .flatMap(importBundledLanguage);

  return [...embedded, ...langs];
};

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
  const imports = options.map(option =>
    typeof option === 'string' ? importFromURL(option) : option
  );

  const imported = await Promise.all(imports);

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
      const { default: bundledTheme } = await bundledThemes[theme]();

      imported = bundledTheme;
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

  const [regexEngine, importedLangs, importedTransformers] = await Promise.all([
    engine,
    importList(langs),
    importList(transformers),
  ]);

  const coreOptions = {
    engine: regexEngine,
    // The bundled languages are registered as code uses them
    langs: withEmbeddedLanguages(importedLangs),
    // A copy, as Shiki adds the aliases of the languages it registers to it
    langAlias: { ...langAlias },
  };

  // Without themes of its own, the highlighter has a default light and dark one
  if (themes) {
    const [light, dark] = await Promise.all([
      importTheme(themes.light, 'light'),
      importTheme(themes.dark, 'dark'),
    ]);

    coreOptions.themes = [light, dark];
  }

  let shiki;
  let highlightOptions;

  /**
   * Gives the Shiki instance, creating it on first use.
   *
   * @returns {import('shiki').HighlighterCore}
   */
  const current = () => {
    if (!shiki) {
      ({ shiki } = createSyntaxHighlighter({ coreOptions }));

      // The themes are given by name: Shiki keeps the themes it loaded parsed,
      // but parses a theme object it's given again for every highlight
      const [light, dark] = shiki.getLoadedThemes();

      highlightOptions = {
        themes: { light, dark },
        defaultColor: 'light',
        transformers: importedTransformers,
      };
    }

    return shiki;
  };

  /**
   * Resolves a language, falling back to plain text for unknown ones. A
   * bundled language is registered the first time it's resolved.
   *
   * @param {string} [languageId]
   * @returns {string}
   */
  const resolveLanguage = languageId => {
    if (!languageId) {
      return FALLBACK_LANGUAGE;
    }

    const instance = current();
    const name = instance.resolveLangAlias(languageId.toLowerCase());

    if (isSpecialLang(name) || instance.getLoadedLanguages().includes(name)) {
      return languageId;
    }

    if (!BUNDLED_NAMES.has(name)) {
      return FALLBACK_LANGUAGE;
    }

    instance.loadLanguageSync(importBundledLanguage(name));

    return languageId;
  };

  /**
   * The options Shiki highlights code with.
   *
   * @param {string} lang - The language of the code
   * @param {Record<string, unknown>} meta - Its metadata
   */
  const optionsFor = (lang, meta) => ({
    lang: resolveLanguage(lang),
    ...highlightOptions,
    meta,
  });

  return {
    langs: [...BUNDLED_LANGUAGES, ...importedLangs],

    /**
     * The Shiki instance.
     */
    get shiki() {
      return current();
    },

    resolveLanguage,

    /**
     * Highlights code, returning the inner HTML of its `<code>` element.
     *
     * @param {string} code - The code
     * @param {string} lang - Its language
     * @param {Record<string, unknown>} [meta] - Its metadata
     */
    highlightToHtml: (code, lang, meta = {}) =>
      current()
        .codeToHtml(code, optionsFor(lang, meta))
        // Shiki wraps the highlighted code in a <pre> and a <code>
        .match(/<code>(.+?)<\/code>/s)[1],

    /**
     * Highlights code, returning a HAST tree.
     *
     * @param {string} code - The code
     * @param {string} lang - Its language
     * @param {Record<string, unknown>} [meta] - Its metadata
     */
    highlightToHast: (code, lang, meta = {}) =>
      current().codeToHast(code, optionsFor(lang, meta)),
  };
};

/**
 * Creates a highlighter of every language Shiki bundles, with the given
 * options (see `./rehype.mjs`). Its Shiki instance is created on first use,
 * each bundled language is registered once code in it is highlighted, and the
 * same options give the same highlighter.
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
