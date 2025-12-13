#!/usr/bin/env node

import process from 'node:process';
import { pathToFileURL } from 'node:url';

import { Command, Option } from 'commander';

import commands from './commands/index.mjs';
import { errorWrap } from './utils.mjs';
import { LogLevel } from '../src/logger/constants.mjs';
import logger from '../src/logger/index.mjs';

/**
 *
 * @param commandsList
 * @param root0
 * @param root0.loggerInstance
 */
export const createProgram = (
  commandsList = commands,
  { loggerInstance = logger } = {}
) => {
  const logLevelOption = new Option('--log-level <level>', 'Log level')
    .choices(Object.keys(LogLevel))
    .default('info');

  const program = new Command()
    .name('@nodejs/doc-kit')
    .description('CLI tool to generate the Node.js API documentation')
    .addOption(logLevelOption)
    .hook('preAction', cmd => loggerInstance.setLogLevel(cmd.opts().logLevel));

  // Registering commands
  commandsList.forEach(({ name, description, options, action }) => {
    const cmd = program.command(name).description(description);

    // Add options to the command
    Object.values(options).forEach(({ flags, desc, prompt }) => {
      const option = new Option(flags.join(', '), desc).default(
        prompt.initialValue
      );

      if (prompt.required) {
        option.makeOptionMandatory();
      }

      if (prompt.type === 'multiselect') {
        option.choices(prompt.options.map(({ value }) => value));
      }

      cmd.addOption(option);
    });

    // Set the action for the command
    cmd.action(errorWrap(action));
  });

  return program;
};

/**
 *
 * @param argv
 */
export const main = (argv = process.argv) => createProgram().parse(argv);

// Parse and execute command-line arguments only when executed directly
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main();
}
