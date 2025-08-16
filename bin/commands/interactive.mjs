import { spawnSync } from 'node:child_process';
import process from 'node:process';

import {
  intro,
  outro,
  select,
  multiselect,
  text,
  confirm,
  isCancel,
  cancel,
} from '@clack/prompts';

import commands from './index.mjs';
import { Logger } from '../../src/logger/index.mjs';

/**
 * Validates that a string is not empty.
 * @param {string} value The input string to validate.
 * @returns {string|undefined} A validation message or undefined if valid.
 */
function requireValue(value) {
  if (value.length === 0) {
    return 'Value is required!';
  }
}

/**
 * Retrieves the prompt message based on whether the field is required or has an initial value.
 * @param {Object} prompt The prompt definition.
 * @param {string} prompt.message The message to display.
 * @param {boolean} prompt.required Whether the input is required.
 * @param {string} [prompt.initialValue] The initial value of the input field.
 * @returns {string} The message to display in the prompt.
 */
function getMessage({ message, required, initialValue }) {
  return required || initialValue ? message : `${message} (Optional)`;
}

/**
 * Escapes shell argument to ensure it's safe for inclusion in shell commands.
 * @param {string} arg The argument to escape.
 * @returns {string} The escaped argument.
 */
function escapeShellArg(arg) {
  // Return the argument as is if it's alphanumeric or contains safe characters
  if (/^[a-zA-Z0-9_/-]+$/.test(arg)) {
    return arg;
  }
  // Escape single quotes in the argument
  return `'${arg.replace(/'/g, `'\\''`)}'`;
}

/**
 * Main interactive function for the API Docs Tooling command line interface.
 * Guides the user through a series of prompts, validates inputs, and generates a command to run.
 * @returns {Promise<void>} Resolves once the command is generated and executed.
 */
export default async function interactive() {
  // Step 1: Introduction to the tool
  intro('Welcome to API Docs Tooling');

  // Step 2: Choose the action based on available command definitions
  const actionOptions = commands.map(({ description }, i) => ({
    label: description,
    value: i,
  }));

  const selectedAction = await select({
    message: 'What would you like to do?',
    options: actionOptions,
  });

  if (isCancel(selectedAction)) {
    cancel('Cancelled.');
    process.exit(0);
  }

  // Retrieve the options for the selected action
  const { options, name } = commands[selectedAction];
  const answers = {}; // Store answers from user prompts

  // Step 3: Collect input for each option
  for (const [key, { prompt }] of Object.entries(options)) {
    let response;
    const promptMessage = getMessage(prompt);

    switch (prompt.type) {
      case 'text':
        response = await text({
          message: promptMessage,
          initialValue: prompt.initialValue || '',
          validate: prompt.required ? requireValue : undefined,
        });
        if (response) {
          // Store response; split into an array if variadic
          answers[key] = prompt.variadic
            ? response.split(',').map(s => s.trim())
            : response;
        }
        break;

      case 'confirm':
        response = await confirm({
          message: promptMessage,
          initialValue: prompt.initialValue,
        });
        answers[key] = response;
        break;

      case 'multiselect':
        response = await multiselect({
          message: promptMessage,
          options: prompt.options,
          required: !!prompt.required,
        });
        answers[key] = response;
        break;

      case 'select':
        response = await select({
          message: promptMessage,
          options: prompt.options,
        });
        answers[key] = response;
        break;
    }

    // Handle cancellation
    if (isCancel(response)) {
      cancel('Cancelled.');
      process.exit(0);
    }
  }

  // Step 4: Build the final command by escaping values
  const cmdParts = ['npx', 'doc-kit', name];
  const executionArgs = [name];

  for (const [key, { flags }] of Object.entries(options)) {
    const value = answers[key];
    // Skip empty values
    if (value == null || (Array.isArray(value) && value.length === 0)) {
      continue;
    }

    const flag = flags[0].split(/[\s,]+/)[0]; // Use the first flag

    // Handle different value types (boolean, array, string)
    if (typeof value === 'boolean') {
      if (value) {
        cmdParts.push(flag);
        executionArgs.push(flag);
      }
    } else if (Array.isArray(value)) {
      for (const item of value) {
        cmdParts.push(flag, escapeShellArg(item));
        executionArgs.push(flag, item);
      }
    } else {
      cmdParts.push(flag, escapeShellArg(value));
      executionArgs.push(flag, value);
    }
  }

  const finalCommand = cmdParts.join(' ');

  Logger.getInstance().info(`\nGenerated command:\n${finalCommand}\n`);

  // Step 5: Confirm and execute the generated command
  if (await confirm({ message: 'Run now?', initialValue: true })) {
    spawnSync(process.execPath, [process.argv[1], ...executionArgs], {
      stdio: 'inherit',
    });
  }

  outro('Done!');
}
