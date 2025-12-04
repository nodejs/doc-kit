import { OVERRIDDEN_POSITIONS } from './constants.mjs';
import { buildSideBarProps } from './utils/buildBarProps.mjs';
import buildContent from './utils/buildContent.mjs';
import { groupNodesByModule } from '../../utils/generators.mjs';
import { getRemarkRecma } from '../../utils/remark.mjs';

/**
 * Generator for converting MDAST to JSX AST.
 *
 * @typedef {Array<ApiDocMetadataEntry>} Input
 * @type {GeneratorMetadata<Input, string>}
 */

/**
 * Sorts entries by OVERRIDDEN_POSITIONS and then heading name.
 * @param {Array<ApiDocMetadataEntry>} entries
 */
const getSortedHeadNodes = entries => {
  return entries
    .filter(node => node.heading.depth === 1)
    .sort((a, b) => {
      const ai = OVERRIDDEN_POSITIONS.indexOf(a.api);
      const bi = OVERRIDDEN_POSITIONS.indexOf(b.api);

      if (ai !== -1 && bi !== -1) {
        return ai - bi;
      }

      if (ai !== -1) {
        return -1;
      }

      if (bi !== -1) {
        return 1;
      }

      return a.heading.data.name.localeCompare(b.heading.data.name);
    });
};

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

      results.push(
        await buildContent(
          groupedModules.get(entry.api),
          entry,
          sideBarProps,
          remarkRecma
        )
      );
    }

    return results;
  },

  /**
   * Generates a JSX AST
   *
   * @param {Input} entries
   * @param {Partial<GeneratorOptions>} options
   * @returns {Promise<Array<string>>} Array of generated content
   */
  async generate(entries, { index, releases, version, worker }) {
    const headNodes = getSortedHeadNodes(entries);

    return worker.map(headNodes, entries, { index, releases, version });
  },
};
