#!/usr/bin/env node

import process from 'node:process';

import { Command, Option } from 'commander';

import commands from './commands/index.mjs';
import { errorWrap } from './utils.mjs';
import logger from '../src/logger/index.mjs';

const program = new Command()
  .name('@nodejs/doc-kit')
  .description('CLI tool to generate the Node.js API documentation');

// Add global log level option
program.addOption(
  new Option('--log-level <level>', 'Log level')
    .choices(['debug', 'info', 'warn', 'error', 'fatal'])
    .default('info')
);

// Set log level before any command runs
program.hook('preAction', thisCommand => {
  const { logLevel } = thisCommand.opts();

  logger.setLogLevel(logLevel);
});

// Registering commands
commands.forEach(({ name, description, options, action }) => {
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

// Parse and execute command-line arguments
program.parse(process.argv);
