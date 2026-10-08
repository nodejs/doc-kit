'use strict';

import { fileURLToPath } from 'node:url';

import { getGeneratorModule } from '#generators/loader.mjs';
import { enforceArray } from '#utils/array.mjs';
import { resolveSpecifier } from '#utils/loaders.mjs';
import { isPlainObject } from '#utils/misc.mjs';

import { CONFIGURED_PLUGINS, PLUGIN_LISTS } from './constants.mjs';

/**
 * The plugins of a Markdown pipeline, as `processor.use()` takes them.
 *
 * @typedef {Record<'remarkPlugins' | 'rehypePlugins' | 'recmaPlugins', import('unified').PluggableList>} MarkdownPlugins
 */

// The pipeline each generator runs on this thread, by its name
const loadedPipelines = new Map();

/**
 * Resolves the module specifiers of Markdown plugins (in the `markdown`
 * option, or a generator's pipeline) from the file declaring them into
 * `file:` URLs, which any thread can import.
 *
 * @param {import('../configuration/types').MarkdownPipeline} markdown - The plugins
 * @param {string} label - Where they are declared, for errors (e.g. `global.markdown`)
 * @param {string} filePath - The file declaring them
 * @returns {import('../configuration/types').MarkdownPipeline}
 */
export const resolveMarkdown = (markdown, label, filePath) => {
  const resolved = { ...markdown };

  for (const list of PLUGIN_LISTS) {
    resolved[list] &&= enforceArray(markdown[list]).map((entry, index) => {
      if (entry === CONFIGURED_PLUGINS) {
        return entry;
      }

      const [specifier, ...options] = enforceArray(entry);

      if (typeof specifier !== 'string') {
        throw new TypeError(
          `${label}.${list}[${index}] in ${filePath} must be a module ` +
            'specifier (a package name or a path), as Markdown is processed ' +
            'in worker threads, which import the plugins themselves.'
        );
      }

      const url = resolveSpecifier(specifier, filePath);

      return options.length === 0 ? url : [url, ...options];
    });
  }

  return resolved;
};

/**
 * Resolves the module specifiers of a generator's Markdown pipeline from the
 * module it was loaded from.
 *
 * @param {GeneratorMetadata} generator - The generator
 * @returns {import('../configuration/types').MarkdownPipeline}
 */
export const resolveMarkdownPipeline = generator => {
  const module = getGeneratorModule(generator);

  return resolveMarkdown(
    generator.markdown,
    `${generator.name}.markdown`,
    module && fileURLToPath(module)
  );
};

/**
 * Merges options into others: arrays add up, plain objects merge, and other
 * values replace the ones they are merged into.
 *
 * @param {unknown} options - The options merged into
 * @param {unknown} added - The options merged
 * @returns {unknown}
 */
const mergeOptions = (options, added) => {
  if (Array.isArray(options) && Array.isArray(added)) {
    return [...options, ...added];
  }

  if (!isPlainObject(options) || !isPlainObject(added)) {
    return added;
  }

  const merged = { ...options };

  for (const [key, value] of Object.entries(added)) {
    merged[key] = mergeOptions(options[key], value);
  }

  return merged;
};

/**
 * Builds a list of a pipeline, with the configured plugins in place of its
 * `'...'`. A configured plugin the list already has, or added earlier, isn't
 * added again: its options merge into the ones it has.
 *
 * @param {Array<import('../configuration/types').PluginEntry | '...'>} [own] - The list
 * @param {Array<import('../configuration/types').PluginEntry>} [configured] - The configured plugins
 * @returns {Array<{ entry: import('../configuration/types').PluginEntry, added: boolean }>}
 */
const configureList = (own = [], configured = []) => {
  const plugins = own.map(entry => ({ entry, added: false }));
  const added = [];

  for (const entry of configured) {
    const [specifier, options] = enforceArray(entry);

    const listed = [...plugins, ...added].find(
      plugin => enforceArray(plugin.entry)[0] === specifier
    );

    if (!listed) {
      added.push({ entry, added: true });
    } else if (options !== undefined) {
      const [, listedOptions] = enforceArray(listed.entry);

      listed.entry = [specifier, mergeOptions(listedOptions, options)];
    }
  }

  return plugins.flatMap(plugin =>
    plugin.entry === CONFIGURED_PLUGINS ? added : [plugin]
  );
};

/**
 * Imports a plugin as `processor.use()` takes it. Its module default-exports
 * the plugin, a list of plugins, or a preset, or exports an async `load`,
 * taking the plugin's options and returning it, for setup unified plugins
 * can't do themselves.
 *
 * @param {import('../configuration/types').PluginEntry} entry - The plugin
 * @returns {Promise<import('unified').Pluggable>}
 */
const importPlugin = async entry => {
  const [specifier, ...options] = enforceArray(entry);
  const { default: plugin, load } = await import(specifier);

  if (typeof load === 'function') {
    return [await load(...options)];
  }

  if (typeof plugin === 'function') {
    return [plugin, ...options];
  }

  // A list is used as a preset, not to be taken for a [plugin, options] pair
  return Array.isArray(plugin) ? { plugins: plugin } : plugin;
};

/**
 * Loads a generator's Markdown pipeline on the current thread, with the
 * plugins configured for it. Loading the same configuration again does
 * nothing.
 *
 * @param {GeneratorMetadata} generator - The generator
 * @param {Partial<import('../configuration/types').MarkdownConfiguration>} [markdown] - The plugins configured for it
 * @returns {Promise<void>}
 */
export const loadMarkdownPlugins = async (generator, markdown = {}) => {
  if (!generator.markdown) {
    return;
  }

  const key = JSON.stringify(markdown);
  const loaded = loadedPipelines.get(generator.name);

  if (loaded?.generator === generator && loaded.key === key) {
    return;
  }

  const pipeline = resolveMarkdownPipeline(generator);
  const configured = {};
  const own = {};

  for (const list of PLUGIN_LISTS) {
    const plugins = configureList(pipeline[list], markdown[list]);

    const imported = await Promise.all(
      plugins.map(({ entry }) => importPlugin(entry))
    );

    configured[list] = imported;
    own[list] = imported.filter((_, index) => !plugins[index].added);
  }

  loadedPipelines.set(generator.name, { generator, key, configured, own });
};

/**
 * Gets the plugins of a generator's Markdown pipeline, as loaded on the
 * current thread: with the configured plugins, or only its own (with their
 * configured options).
 *
 * @param {string} generator - The name of the generator
 * @param {boolean} [configured] - Whether with the configured plugins
 * @returns {MarkdownPlugins}
 */
export const getMarkdownPlugins = (generator, configured = true) => {
  const loaded = loadedPipelines.get(generator);

  if (!loaded) {
    throw new Error(
      `The Markdown pipeline of "${generator}" is not loaded on this thread`
    );
  }

  return configured ? loaded.configured : loaded.own;
};
