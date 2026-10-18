import { getMarkdownPlugins } from '#utils/markdown/plugins.mjs';

/**
 * Test generator that reports the rehype plugins of its Markdown pipeline as
 * loaded inside the worker, so their loading there can be asserted.
 *
 * @type {GeneratorMetadata<unknown, string[][]>}
 */
export default {
  name: 'markdown-plugins-reporter',
  version: '1.0.0',
  description: 'Reports the rehype plugins loaded inside the worker',
  dependsOn: 'ast',
  markdown: { rehypePlugins: ['./rehype-plugin.mjs', '...'] },
  processChunk: async (_input, itemIndices) =>
    itemIndices.map(() =>
      getMarkdownPlugins('markdown-plugins-reporter').rehypePlugins.map(
        ([plugin, options]) => `${plugin.name} ${JSON.stringify(options)}`
      )
    ),
  async generate() {
    return [];
  },
};
