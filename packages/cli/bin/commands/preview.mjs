import { existsSync } from 'node:fs';

import createGenerator from '@doc-kit/core';
import logger from '@doc-kit/core/logger/index.mjs';
import { DEFAULT_OUTPUT_DIRECTORY } from '@doc-kit/core/utils/configuration/constants.mjs';
import {
  assertRunnableOptions,
  setConfig,
} from '@doc-kit/core/utils/configuration/index.mjs';
import { Command, Option } from 'commander';

import { serve } from '../../src/serve.mjs';
import { errorWrap } from '../utils.mjs';
import { generateOptions } from './generate.mjs';

const { runGenerators } = createGenerator();

/**
 * Options that only affect serving, and therefore don't trigger a build
 */
const SERVE_OPTIONS = ['host', 'port'];

/**
 * Whether any option besides the serving ones (`--host`, `--port`) was passed
 * on the command line, meaning the docs should be (re)built before serving
 *
 * @param {Command} command - The `preview` command
 * @returns {boolean}
 */
const shouldBuild = command =>
  command.options.some(
    option =>
      !SERVE_OPTIONS.includes(option.attributeName()) &&
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
  )
  .addOption(
    new Option('--host <host>', 'Host to listen on').default('localhost')
  );

generateOptions.forEach(option => preview.addOption(option));

export default preview.action(
  errorWrap(async (opts, command) => {
    if (!Number.isInteger(opts.port) || opts.port < 0 || opts.port > 65535) {
      throw new Error(`Invalid port: ${opts.port}`);
    }

    let output = opts.output ?? DEFAULT_OUTPUT_DIRECTORY;

    if (shouldBuild(command)) {
      const config = await setConfig(opts);
      assertRunnableOptions(config);

      await runGenerators(config);

      // With the default coming from the configuration, this is always set
      output = config.global.output;
    } else if (!existsSync(output)) {
      throw new Error(
        `Nothing to serve: \`${output}\` does not exist. Run ` +
          '`doc-kit generate` first, or pass `generate` options to ' +
          '`doc-kit preview` to build before serving.'
      );
    }

    const server = await serve(output, { host: opts.host, port: opts.port });

    logger.info(
      `Serving ${output} at http://${opts.host}:${server.address().port}/ ` +
        '(Ctrl+C to stop)'
    );
  })
);
