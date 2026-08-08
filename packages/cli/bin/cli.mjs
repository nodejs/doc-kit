#!/usr/bin/env node

import process from 'node:process';

import { LogLevel } from '@doc-kit/core/logger/constants.mjs';
import logger from '@doc-kit/core/logger/index.mjs';
import { Command, Option } from 'commander';

import commands from './commands/index.mjs';

const program = new Command()
  .name('doc-kit')
  .description('CLI tool to generate the Node.js API documentation')
  .addOption(
    new Option('--log-level <level>', 'Log level')
      .default('info')
      .choices(Object.keys(LogLevel))
  )
  .hook('preAction', cmd => logger.setLogLevel(cmd.opts().logLevel));

// Registering commands
commands.forEach(command => program.addCommand(command));

// Parse and execute command-line arguments
program.parse(process.argv);
