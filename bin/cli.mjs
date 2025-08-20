#!/usr/bin/env node

import process from 'node:process';

import { Command, Option } from 'commander';

import commands from './commands/index.mjs';
import interactive from './commands/interactive.mjs';
import { errorWrap } from './utils.mjs';

const program = new Command()
  .name('@nodejs/doc-kit')
  .description('CLI tool to generate the Node.js API documentation');

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

// Register the interactive command
program
  .command('interactive')
  .description('Launch guided CLI wizard')
  .action(errorWrap(interactive));

// Parse and execute command-line arguments
program.parse(process.argv);
