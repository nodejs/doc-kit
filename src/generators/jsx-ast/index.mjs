import { buildSideBarProps } from './utils/buildBarProps.mjs';
import buildContent from './utils/buildContent.mjs';
import { getSortedHeadNodes } from './utils/getSortedHeadNodes.mjs';
import { groupNodesByModule } from '../../utils/generators.mjs';
import { getRemarkRecma } from '../../utils/remark.mjs';

/**
 * Generator for converting MDAST to JSX AST.
 *
 * @typedef {Array<ApiDocMetadataEntry>} Input
 * @type {GeneratorMetadata<Input, string>}
 */
export default {
  name: 'jsx-ast',

  version: '1.0.0',

  description: 'Generates JSX AST from the input MDAST',

  dependsOn: 'metadata',

  /**
   * Process a chunk of items in a worker thread.
   * @param {Input} fullInput
   * @param {number[]} itemIndices
   * @param {Partial<GeneratorOptions>} options
   */
  async processChunk(fullInput, itemIndices, { index, releases, version }) {
    const remarkRecma = getRemarkRecma();
    const groupedModules = groupNodesByModule(fullInput);
    const headNodes = getSortedHeadNodes(fullInput);

    const docPages = index
      ? index.map(({ section, api }) => [section, `${api}.html`])
      : headNodes.map(node => [node.heading.data.name, `${node.api}.html`]);

    const results = [];

    for (const idx of itemIndices) {
      const entry = headNodes[idx];

      const sideBarProps = buildSideBarProps(
        entry,
        releases,
        version,
        docPages
      );

      const content = await buildContent(
        groupedModules.get(entry.api),
        entry,
        sideBarProps,
        remarkRecma
      );

      results.push(content);
    }

    return results;
  },

  /**
   * Generates a JSX AST
   *
   * @param {Input} entries
   * @param {Partial<GeneratorOptions>} options
   * @returns {AsyncGenerator<Array<string>>}
   */
  async *generate(entries, { index, releases, version, worker }) {
    const headNodes = entries.filter(node => node.heading.depth === 1);

    const deps = { index, releases, version };

    for await (const chunkResult of worker.stream(headNodes, entries, deps)) {
      yield chunkResult;
    }
  },
};
