import { Command, Option } from 'commander';

import { publicGenerators } from '../../src/generators/index.mjs';
import logger from '../../src/logger/index.mjs';
import { enforceArray } from '../../src/utils/array.mjs';
import { loadConfigFile } from '../../src/utils/configuration/index.mjs';
import { installGeneratorPackages } from '../../src/utils/install.mjs';
import { errorWrap } from '../utils.mjs';

const installLogger = logger.child('install');

export default new Command('install')
  .description(
    'Install the packages providing built-in generators ' +
      '(defaults to the targets in your configuration file)'
  )
  .argument(
    '[generators...]',
    `Built-in generator names (${Object.keys(publicGenerators).join(', ')})`
  )
  .addOption(new Option('--config-file <path>', 'Config file'))
  .action(
    errorWrap(async (generators, opts) => {
      let names = generators;
      const fromConfig = !names.length;

      if (fromConfig) {
        const config = await loadConfigFile(opts.configFile);
        names = enforceArray(config.target ?? []);

        if (!names.length) {
          throw new Error(
            'Nothing to install: pass generator names ' +
              '(e.g. `doc-kit install html`) or set `target` in your ' +
              'configuration file.'
          );
        }

        installLogger.info(
          `Installing generators from your configuration: ${names.join(', ')}`
        );
      }

      // Configuration targets may be import specifiers of third-party
      // generators; explicit arguments must be built-in names
      const packages = installGeneratorPackages(names, fromConfig);

      installLogger.info(
        packages.length
          ? `Installed ${packages.join(', ')}`
          : 'All requested generators are already part of this package — ' +
              'nothing to install.'
      );
    })
  );
