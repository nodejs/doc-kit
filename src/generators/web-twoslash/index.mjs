import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import bundleCode from '../web/utils/bundle.mjs';

/**
 * Bundles the Twoslash client-side script and writes it as an external file
 *
 * @type {GeneratorMetadata<never, void>}
 */
export default {
  name: 'web-twoslash',
  version: '1.0.0',
  description: 'Generates client-side Twoslash script for web bundle',
  dependsOn: null,

  /**
   * Generates the Twoslash client script with content hash
   *
   * @param {never} _ - No input needed
   * @param {Partial<GeneratorOptions>} options
   * @returns {Promise<void>}
   */
  async generate(_, { output }) {
    // Read the client code from file
    const twoslashClientCode = await readFile(
      new URL('client.mjs', import.meta.url),
      'utf-8'
    );

    // Bundle the code
    const { js } = await bundleCode(twoslashClientCode, {
      server: false,
    });

    // Write the files if output directory is specified
    if (output) {
      await writeFile(join(output, 'twoslash.js'), js, 'utf-8');
    }
  },
};
