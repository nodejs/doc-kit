'use strict';

import { cp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import HTMLMinifier from '@minify-html/node';

import buildContent from './utils/buildContent.mjs';
import dropdowns from './utils/buildDropdowns.mjs';
import tableOfContents from './utils/tableOfContents.mjs';
import { groupNodesByModule } from '../../utils/generators.mjs';
import { getRemarkRehype } from '../../utils/remark.mjs';

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
 *
 * This generator generates the legacy HTML pages of the legacy API docs
 * for retro-compatibility and while we are implementing the new 'react' and 'html' generators.
 *
 * This generator is a top-level generator, and it takes the raw AST tree of the API doc files
 * and generates the HTML files to the specified output directory from the configuration settings
 *
 * @typedef {Array<ApiDocMetadataEntry>} Input
 *
 * @type {GeneratorMetadata<Input, Array<TemplateValues>>}
 */
export default {
  name: 'legacy-html',

  version: '1.0.0',

  description:
    'Generates the legacy version of the API docs in HTML, with the assets and styles included as files',

  dependsOn: 'metadata',

  /**
   * Generates the legacy version of the API docs in HTML
   * @param {Input} input
   * @param {Partial<GeneratorOptions>} options
   */
  async generate(input, { index, releases, version, output }) {
    // This array holds all the generated values for each module
    const generatedValues = [];

    // Gets a Remark Processor that parses Markdown to minified HTML
    const remarkRehypeProcessor = getRemarkRehype();

    const groupedModules = groupNodesByModule(input);

    // Current directory path relative to the `index.mjs` file
    const baseDir = import.meta.dirname;

    // Reads the API template.html file to be used as a base for the HTML files
    const apiTemplate = await readFile(join(baseDir, 'template.html'), 'utf-8');

    // Gets the first nodes of each module, which is considered the "head" of the module
    // and sorts them alphabetically by the "name" property of the heading
    const headNodes = input
      .filter(node => node.heading.depth === 1)
      .sort((a, b) => a.heading.data.name.localeCompare(b.heading.data.name));

    const indexOfFiles = index
      ? index.map(entry => ({
          api: entry.api,
          heading: { data: { depth: 1, name: entry.section } },
        }))
      : headNodes;

    // Generates the global Table of Contents (Sidebar Navigation)
    const parsedSideNav = remarkRehypeProcessor.processSync(
      tableOfContents(indexOfFiles, {
        maxDepth: 1,
        parser: tableOfContents.parseNavigationNode,
      })
    );

    /**
     * Replaces the aggregated data from a node within a template
     *
     * @param {TemplateValues} values The values to be replaced in the template
     */
    const replaceTemplateValues = values => {
      const { api, added, section, version, toc, nav, content } = values;
      return apiTemplate
        .replace('__ID__', api)
        .replace(/__FILENAME__/g, api)
        .replace('__SECTION__', section)
        .replace(/__VERSION__/g, version)
        .replace(/__TOC__/g, tableOfContents.wrapToC(toc))
        .replace(/__GTOC__/g, nav)
        .replace('__CONTENT__', content)
        .replace(/__TOC_PICKER__/g, dropdowns.buildToC(toc))
        .replace(/__GTOC_PICKER__/g, dropdowns.buildNavigation(nav))
        .replace('__ALTDOCS__', dropdowns.buildVersions(api, added, releases))
        .replace('__EDIT_ON_GITHUB__', dropdowns.buildGitHub(api));
    };

    /**
     * Processes each module node to generate the HTML content
     *
     * @param {ApiDocMetadataEntry} head The name of the module to be generated
     * @param {string} template The template to be used to generate the HTML content
     */
    const processModuleNodes = head => {
      const nodes = groupedModules.get(head.api);

      // Replaces the entry corresponding to the current module
      // as an active entry within the side navigation
      const activeSideNav = String(parsedSideNav).replace(
        `class="nav-${head.api}`,
        `class="nav-${head.api} active`
      );

      // Generates the Table of Contents for the current module, which is appended
      // to the top of the page and also to a dropdown
      const parsedToC = remarkRehypeProcessor.processSync(
        tableOfContents(nodes, {
          maxDepth: 4,
          parser: tableOfContents.parseToCNode,
        })
      );

      // Builds the content of the module, including all sections,
      // stability indexes, and content for the current file
      const parsedContent = buildContent(
        headNodes,
        nodes,
        remarkRehypeProcessor
      );

      // In case there's no Heading, we make a little capitalization of the filename
      const apiAsHeading = head.api.charAt(0).toUpperCase() + head.api.slice(1);

      const generatedTemplate = {
        api: head.api,
        added: head.introduced_in ?? '',
        section: head.heading.data.name || apiAsHeading,
        version: `v${version.version}`,
        toc: String(parsedToC),
        nav: String(activeSideNav),
        content: parsedContent,
      };

      // Adds the generated template to the list of generated values
      generatedValues.push(generatedTemplate);

      // Replaces all the values within the template for the current doc
      return replaceTemplateValues(generatedTemplate);
    };

    for (const node of headNodes) {
      const result = processModuleNodes(node);

      if (output) {
        // We minify the html result to reduce the file size and keep it "clean"
        const minified = HTMLMinifier.minify(Buffer.from(result), {});

        await writeFile(join(output, `${node.api}.html`), minified);
      }
    }

    if (output) {
      try {
        // Define the output folder for API docs assets
        const assetsFolder = join(output, 'assets');

        // Removes the current assets directory to copy the new assets
        // and prevent stale assets from existing in the output directory
        // If the path does not exists, it will simply ignore and continue
        await rm(assetsFolder, {
          recursive: true,
          force: true,
          maxRetries: 10,
        });

        // We copy all the other assets to the output folder at the end of the process
        // to ensure that all latest changes on the styles are applied to the output
        // Note.: This is not meant to be used for DX/developer purposes.
        await cp(join(baseDir, 'assets'), assetsFolder, {
          recursive: true,
          force: true,
        });
      } finally {
        // There's a chance that this step will fail when being run in parallel, since
        // the generators will all attempt to modify the same files at the same time.
        // In that scenario, we just want to ignore the potential failure.
      }
    }

    return generatedValues;
  },
};
