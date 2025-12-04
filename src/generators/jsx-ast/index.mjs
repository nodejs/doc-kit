import { buildSideBarProps } from './utils/buildBarProps.mjs';
import buildContent from './utils/buildContent.mjs';
import {
  buildDocPages,
  getSortedHeadNodes,
  groupNodesByModule,
} from '../../utils/generators.mjs';
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
    const processor = getRemarkRecma();
    const groupedModules = groupNodesByModule(fullInput);
    const headNodes = getSortedHeadNodes(fullInput);
    const docPages = buildDocPages(headNodes, index);

    return Promise.all(
      itemIndices.map(async idx => {
        const entry = headNodes[idx];

        const sideBarProps = buildSideBarProps(
          entry,
          releases,
          version,
          docPages
        );

        return buildContent(
          groupedModules.get(entry.api),
          entry,
          sideBarProps,
          processor
        );
      })
    );
  },

  /**
   * Generates a JSX AST
   * @param {Input} entries
   * @param {Partial<GeneratorOptions>} options
   */
  async generate(entries, { index, releases, version, worker }) {
    const headNodes = getSortedHeadNodes(entries);

    return worker.map(headNodes, entries, { index, releases, version });
  },
};
