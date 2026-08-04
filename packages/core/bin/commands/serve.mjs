import { Command, Option } from 'commander';

import { createConfigurationOptions } from './options.mjs';
import createGenerator from '../../src/generators.mjs';
import logger from '../../src/logger/index.mjs';
import {
  createRebuildScheduler,
  createStaticServer,
  listenOnAvailablePort,
  watchPaths,
} from '../../src/server/index.mjs';
import { enforceArray } from '../../src/utils/array.mjs';
import {
  assertRunnableOptions,
  loadConfigFile,
  setConfig,
} from '../../src/utils/configuration/index.mjs';
import { errorWrap } from '../utils.mjs';

const serveLogger = logger.child('serve');

const serve = new Command('serve').description(
  'Generate API docs, serve them locally, and regenerate on changes'
);

createConfigurationOptions().forEach(option => serve.addOption(option));

export default serve
  .addOption(
    new Option(
      '--port <number>',
      'Preferred port (falls back to the next available one)'
    )
      .default(3000)
      .argParser(Number)
  )
  .addOption(
    new Option(
      '--static',
      'Serve the existing output as-is, without generating or watching'
    )
  )
  .action(
    errorWrap(async opts => {
      // Static mode only needs an output directory, so skip the full run
      // configuration (which resolves generators and fetches the changelog)
      const config = opts.static ? undefined : await setConfig(opts);

      const output =
        config?.global?.output ??
        opts.output ??
        (await loadConfigFile(opts.configFile)).global?.output;

      if (!output) {
        throw new Error(
          'An output directory is required to serve: pass `-o`/`--output` ' +
            'or set `output` in your configuration file.'
        );
      }

      if (config) {
        assertRunnableOptions(config);

        serveLogger.info('Generating documentation...');
        await createGenerator().runGenerators(config);
      }

      const server = createStaticServer(output);
      const port = await listenOnAvailablePort(server, opts.port);

      serveLogger.info(`Serving documentation at http://localhost:${port}`);

      if (config) {
        // A fresh generator per run: caches and worker pools are scoped to a
        // single pipeline execution. A failed rebuild keeps serving the last
        // good output.
        const schedule = createRebuildScheduler(async () => {
          serveLogger.info('Change detected, regenerating...');

          try {
            await createGenerator().runGenerators(config);
            serveLogger.info('Documentation regenerated');
          } catch (error) {
            serveLogger.error(error);
          }
        });

        const { dirs } = watchPaths(
          enforceArray(config.global.input),
          schedule
        );

        serveLogger.info(`Watching for changes in ${dirs.join(', ')}`);
      }
    })
  );
