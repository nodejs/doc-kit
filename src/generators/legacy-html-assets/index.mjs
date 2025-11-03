// @ts-check
'use strict';

import { cp, rm } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * TODO docs
 *
 * @type {GeneratorMetadata<Input, Array<TemplateValues>>}
 */
export default {
  name: 'legacy-html-assets',

  version: '1.0.0',

  description: 'TODO',

  dependsOn: 'metadata',

  /**
   * Generates the legacy version of the API docs in HTML
   * @param {Input} _
   * @param {Partial<GeneratorOptions>} options
   */
  async generate(_, { output }) {
    if (!output) {
      return;
    }

    // Define the output folder for API docs assets
    const assetsFolder = join(output, 'assets');

    // Removes the current assets directory to copy the new assets
    // and prevent stale assets from existing in the output directory
    // If the path does not exists, it will simply ignore and continue
    await rm(assetsFolder, { recursive: true, force: true, maxRetries: 10 });

    // Current directory path relative to the `index.mjs` file
    const baseDir = import.meta.dirname;

    // We copy all the other assets to the output folder at the end of the process
    // to ensure that all latest changes on the styles are applied to the output
    // Note.: This is not meant to be used for DX/developer purposes.
    await cp(join(baseDir, 'assets'), assetsFolder, {
      recursive: true,
      force: true,
    });
  },
};
