import { cpus } from 'node:os';

import { Command, Option } from 'commander';
import { coerce } from 'semver';

import { NODE_CHANGELOG_URL, NODE_VERSION } from '../../src/constants.mjs';
import { publicGenerators } from '../../src/generators/index.mjs';
import createGenerator from '../../src/generators.mjs';
import logger from '../../src/logger/index.mjs';
import { parseTypeMap } from '../../src/parsers/json.mjs';
import { parseChangelog, parseIndex } from '../../src/parsers/markdown.mjs';
import { DEFAULT_TYPE_MAP } from '../../src/utils/parser/constants.mjs';
import { errorWrap } from '../utils.mjs';

export default new Command('generate')
  .description('Generate API docs')
  .addOption(
    new Option(
      '-i, --input <patterns...>',
      'Input file patterns (glob)'
    ).makeOptionMandatory()
  )
  .addOption(
    new Option('--ignore <patterns...>', 'Ignore file patterns (glob)')
  )
  .addOption(new Option('-o, --output <directory>', 'The output directory'))
  .addOption(
    new Option(
      '-p, --threads <number>',
      'Number of threads to use (minimum: 1)'
    )
      .default(cpus().length)
      .argParser(parseInt)
  )
  .addOption(
    new Option(
      '--chunk-size <number>',
      'Number of items to process per worker thread (minimum: 1)'
    )
      .default(10)
      .argParser(parseInt)
  )
  .addOption(
    new Option('-v, --version <semver>', 'Target Node.js version').default(
      NODE_VERSION
    )
  )
  .addOption(
    new Option('-c, --changelog <url>', 'Changelog URL or path').default(
      NODE_CHANGELOG_URL
    )
  )
  .addOption(
    new Option('--git-ref', 'Git ref URL').default(
      'https://github.com/nodejs/node/tree/HEAD'
    )
  )
  .addOption(
    new Option('-t, --target <generator...>', 'Target generator(s)')
      .makeOptionMandatory()
      .choices(Object.keys(publicGenerators))
  )
  .addOption(new Option('--index <url>', 'index.md URL or path'))
  .addOption(
    new Option('--type-map <url>', 'Type map URL or path').default(
      DEFAULT_TYPE_MAP
    )
  )
  .action(
    errorWrap(async opts => {
      logger.debug('Starting doc-kit', opts);

      const { runGenerators } = createGenerator();

      logger.debug('Starting generation', { targets: opts.target });

      await runGenerators({
        generators: opts.target,
        input: opts.input,
        ignore: opts.ignore,
        output: opts.output,
        version: coerce(opts.version),
        releases: await parseChangelog(opts.changelog),
        gitRef: opts.gitRef,
        threads: Math.max(opts.threads, 1),
        chunkSize: Math.max(opts.chunkSize, 1),
        index: await parseIndex(opts.index),
        typeMap: await parseTypeMap(opts.typeMap),
      });
    })
  );
