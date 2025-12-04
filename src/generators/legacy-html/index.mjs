'use strict';

import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

import HTMLMinifier from '@minify-html/node';

import buildContent from './utils/buildContent.mjs';
import { safeCopy } from './utils/safeCopy.mjs';
import tableOfContents from './utils/tableOfContents.mjs';
import { createTemplateReplacer, getTemplate } from './utils/template.mjs';
import { getHeadNodes, groupNodesByModule } from '../../utils/generators.mjs';
import { getRemarkRehypeWithShiki } from '../../utils/remark.mjs';

/**
 * @typedef {{
 * api: string;
 * added: string;
 * section: string;
 * version: string;
 * toc: string;
 * nav: string;
 * content: string;
 * }} TemplateValues
 */

/**
 * Processes a single head node into TemplateValues
 * @param {ApiDocMetadataEntry} head
 * @param {Object} ctx
 * @returns {TemplateValues}
 */
const processNode = (head, ctx) => {
  const { groupedModules, headNodes, processor, sideNav, version } = ctx;

  const nodes = groupedModules.get(head.api);

  const activeSideNav = String(sideNav).replace(
    `class="nav-${head.api}`,
    `class="nav-${head.api} active`
  );

  const toc = processor.processSync(
    tableOfContents(nodes, {
      maxDepth: 4,
      parser: tableOfContents.parseToCNode,
    })
  );

  const content = buildContent(headNodes, nodes, processor);

  const apiAsHeading = head.api.charAt(0).toUpperCase() + head.api.slice(1);

  return {
    api: head.api,
    added: head.introduced_in ?? '',
    section: head.heading.data.name || apiAsHeading,
    version: `v${version.version}`,
    toc: String(toc),
    nav: activeSideNav,
    content,
  };
};

/**
 * This generator generates the legacy HTML pages of the legacy API docs
 * for retro-compatibility and while we are implementing the new 'react' and 'html' generators.
 *
 * @typedef {Array<ApiDocMetadataEntry>} Input
 * @type {GeneratorMetadata<Input, Array<TemplateValues>>}
 */
export default {
  name: 'legacy-html',
  version: '1.0.0',
  description:
    'Generates the legacy version of the API docs in HTML, with the assets and styles included as files',
  dependsOn: 'metadata',

  /**
   * Process a chunk of items in a worker thread.
   * @param {Input} fullInput
   * @param {number[]} itemIndices
   * @param {Partial<GeneratorOptions>} options
   */
  async processChunk(
    fullInput,
    itemIndices,
    { index, releases, version, output }
  ) {
    const processor = getRemarkRehypeWithShiki();
    const template = await getTemplate();
    const headNodes = getHeadNodes(fullInput);
    const groupedModules = groupNodesByModule(fullInput);

    const indexOfFiles = index
      ? index.map(({ api, section: name }) => ({
          api,
          heading: { data: { depth: 1, name } },
        }))
      : headNodes;

    const sideNav = processor.processSync(
      tableOfContents(indexOfFiles, {
        maxDepth: 1,
        parser: tableOfContents.parseNavigationNode,
      })
    );

    const replaceTemplate = createTemplateReplacer(template, releases);
    const ctx = { groupedModules, headNodes, processor, sideNav, version };

    const results = await Promise.all(
      itemIndices.map(async idx => {
        const values = processNode(headNodes[idx], ctx);

        if (output) {
          const html = replaceTemplate(values);
          const minified = HTMLMinifier.minify(Buffer.from(html), {});

          await writeFile(join(output, `${values.api}.html`), minified);
        }

        return values;
      })
    );

    return results;
  },

  /**
   * Generates the legacy version of the API docs in HTML
   * @param {Input} input
   * @param {Partial<GeneratorOptions>} options
   */
  async generate(input, { index, releases, version, output, worker }) {
    const headNodes = getHeadNodes(input);

    const generatedValues = await worker.map(headNodes, input, {
      index,
      releases,
      version,
      output,
    });

    if (output) {
      await mkdir(join(output, 'assets'), { recursive: true });

      await safeCopy(
        join(import.meta.dirname, 'assets'),
        join(output, 'assets')
      );
    }

    return generatedValues;
  },
};
