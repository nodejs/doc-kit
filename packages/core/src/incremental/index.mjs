'use strict';

import { resolve } from 'node:path';

import logger from '#logger/index.mjs';

import { SCHEMA } from './constants.mjs';
import { loadManifest, saveManifest } from './manifest.mjs';
import { createSection, DISABLED_SECTION } from './section.mjs';

const incrementalLogger = logger.child('incremental');

/**
 * Opens an output directory's manifest for a build.
 *
 * @param {string} output - The absolute output directory
 * @returns {Promise<{ previous: import('./types').Manifest, sections: Map<string, ReturnType<typeof createSection>> }>}
 */
const openManifest = async output => {
  const { manifest: previous, reason } = await loadManifest(output);

  if (reason) {
    incrementalLogger.info(`${reason}; writing every file again`);
  } else {
    // Marked until this build saves its own manifest, because output files
    // are about to be overwritten
    await saveManifest(output, { ...previous, building: true });
  }

  return { previous, sections: new Map() };
};

/**
 * Creates the incremental state for a run: one manifest per output directory.
 *
 * @param {{ enabled: boolean }} options
 * @returns {import('./types').IncrementalStore}
 */
export const createIncrementalStore = ({ enabled }) => {
  /** @type {Map<string, ReturnType<typeof openManifest>>} */
  const directories = new Map();

  return {
    /** @type {import('./types').IncrementalStore['section']} */
    async section(generator, config) {
      if (!enabled || !config?.output) {
        return DISABLED_SECTION;
      }

      const { name } = generator;
      const output = resolve(config.output);

      if (!directories.has(output)) {
        directories.set(output, openManifest(output));
      }

      const { previous, sections } = await directories.get(output);

      if (!sections.has(name)) {
        sections.set(
          name,
          createSection(generator, config, output, previous.generators[name])
        );
      }

      return (await sections.get(name)).section;
    },

    /** @type {import('./types').IncrementalStore['save']} */
    async save() {
      for (const [output, opened] of directories) {
        const { previous, sections } = await opened;

        // Generators that did not run keep their entries
        const generators = { ...previous.generators };

        for (const [name, section] of sections) {
          const outputs = await (await section).close();

          if (Object.keys(outputs).length > 0) {
            generators[name] = outputs;
          } else {
            delete generators[name];
          }
        }

        await saveManifest(output, { schema: SCHEMA, generators });

        incrementalLogger.debug(`Saved manifest`, {
          output,
          generators: Object.keys(generators),
        });
      }
    },
  };
};
