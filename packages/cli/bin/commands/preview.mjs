import { existsSync } from 'node:fs';

import createGenerator from '@doc-kit/core';
import logger from '@doc-kit/core/logger/index.mjs';
import {
  assertRunnableOptions,
  setConfig,
} from '@doc-kit/core/utils/configuration/index.mjs';
import { Command, Option } from 'commander';

import { serve } from '../../src/serve.mjs';
import { errorWrap } from '../utils.mjs';
import { generateOptions } from './generate.mjs';

const { runGenerators } = createGenerator();

const DEFAULT_OUTPUT = './out';

/**
 * Whether any option besides `--port` was passed on the command line, meaning
 * the docs should be (re)built before serving
 *
 * @param {Command} command - The `preview` command
 * @returns {boolean}
 */
const shouldBuild = command =>
  command.options.some(
    option =>
      option.attributeName() !== 'port' &&
      command.getOptionValueSource(option.attributeName()) === 'cli'
  );

const preview = new Command('preview')
  .description(
    'Serve the generated docs locally, building first when any ' +
      '`generate` option is passed'
  )
  .addOption(
    new Option('--port <number>', 'Port to serve on')
      .default(3000)
      .argParser(Number)
  );

generateOptions.forEach(option => preview.addOption(option));

export default preview.action(
  errorWrap(async (opts, command) => {
    if (!Number.isInteger(opts.port) || opts.port < 0 || opts.port > 65535) {
      throw new Error(`Invalid port: ${opts.port}`);
    }

    let output = opts.output ?? DEFAULT_OUTPUT;

    if (shouldBuild(command)) {
      const config = await setConfig(opts);
      assertRunnableOptions(config);

      await runGenerators(config);

      output = config.global.output ?? DEFAULT_OUTPUT;
    } else if (!existsSync(output)) {
      throw new Error(
        `Nothing to serve: \`${output}\` does not exist. Run ` +
          '`doc-kit generate` first, or pass `generate` options to ' +
          '`doc-kit preview` to build before serving.'
      );
    }

    const server = await serve(output, { port: opts.port });

    logger.info(
      `Serving ${output} at http://localhost:${server.address().port}/ ` +
        '(Ctrl+C to stop)'
    );
  })
);
