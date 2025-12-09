import { buildSideBarProps } from './utils/buildBarProps.mjs';
import buildContent from './utils/buildContent.mjs';
import { getSortedHeadNodes } from './utils/getSortedHeadNodes.mjs';
import { groupNodesByModule } from '../../utils/generators.mjs';
import { getRemarkRecma } from '../../utils/remark.mjs';

const remarkRecma = getRemarkRecma();

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
   * Transforms metadata entries into JSX AST nodes.
   *
   * Each item is a SlicedModuleInput containing the head node
   * and all entries for that module - no need to recompute grouping.
   *
   * @param {Array<{head: ApiDocMetadataEntry, entries: Array<ApiDocMetadataEntry>}>} slicedInput - Pre-sliced module data
   * @param {number[]} itemIndices - Indices of items to process
   * @param {object} options - Serializable options
   * @param {Array<[string, string]>} options.docPages - Pre-computed doc pages for sidebar
   * @param {Array<ApiDocReleaseEntry>} options.releases - Release information
   * @param {import('semver').SemVer} options.version - Target Node.js version
   * @returns {Promise<Array<import('estree-jsx').Program>>} JSX AST programs for each module
   */
  async processChunk(
    slicedInput,
    itemIndices,
    { docPages, releases, version }
  ) {
    const results = [];

    for (const idx of itemIndices) {
      const { head, entries } = slicedInput[idx];

      const sideBarProps = buildSideBarProps(head, releases, version, docPages);

      const content = await buildContent(
        entries,
        head,
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
    const groupedModules = groupNodesByModule(entries);
    const headNodes = getSortedHeadNodes(entries);

    // Pre-compute docPages once in main thread
    const docPages = index
      ? index.map(({ section, api }) => [section, `${api}.html`])
      : headNodes.map(node => [node.heading.data.name, `${node.api}.html`]);

    // Create sliced input: each item contains head + its module's entries
    // This avoids sending all 4700+ entries to every worker
    const input = headNodes.map(head => ({
      head,
      entries: groupedModules.get(head.api),
    }));

    const deps = { docPages, releases, version };

    for await (const chunkResult of worker.stream(input, input, deps)) {
      yield chunkResult;
    }
  },
};
