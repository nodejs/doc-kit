'use strict';

import remarkMdx from 'remark-mdx';
import { unified } from 'unified';

import { PLUGIN_LISTS } from './constants.mjs';
import { getMarkdownPlugins } from './plugins.mjs';

// The processors of each loaded pipeline, of Markdown and of MDX
const processors = new WeakMap();

/**
 * Creates the processor of a pipeline: its remark plugins, then its rehype
 * ones, then its recma ones. A processor of MDX knows its syntax too, and
 * tells plugins it processes MDX through `this.data('mdx')`.
 *
 * @param {import('./plugins.mjs').MarkdownPlugins} plugins - The pipeline
 * @param {boolean} mdx - Whether it processes MDX
 * @returns {import('unified').Processor}
 */
const createProcessor = (plugins, mdx) => {
  const processor = unified().data('mdx', mdx);

  if (mdx) {
    processor.use(remarkMdx);
  }

  for (const list of PLUGIN_LISTS) {
    processor.use(plugins[list]);
  }

  return processor;
};

/**
 * Gets the processor of a generator's Markdown pipeline, as loaded on the
 * current thread (see `loadMarkdownPlugins`).
 *
 * @param {string} generator - The name of the generator
 * @param {Object} [options]
 * @param {boolean} [options.mdx] - Whether it processes MDX
 * @param {boolean} [options.configured] - Whether it runs the configured
 * plugins, rather than only the generator's own
 * @returns {import('unified').Processor}
 */
export const getProcessor = (
  generator,
  { mdx = false, configured = true } = {}
) => {
  const plugins = getMarkdownPlugins(generator, configured);

  if (!processors.has(plugins)) {
    processors.set(plugins, {});
  }

  const created = processors.get(plugins);
  const syntax = mdx ? 'mdx' : 'markdown';

  return (created[syntax] ??= createProcessor(plugins, mdx));
};
