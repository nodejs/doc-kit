'use strict';

import { EOL } from 'node:os';

import {
  commandDataEscapes,
  commandPropertyEscapes,
  levelToGitHubCommand,
} from '#logger/constants.mjs';
import { prettifyLevel } from '#logger/utils/colors.mjs';
import { prettifyTimestamp } from '#logger/utils/time.mjs';

/**
 * Escapes a value of a workflow command: its message, with
 * `commandDataEscapes`, or one of its properties, with
 * `commandPropertyEscapes`.
 *
 * @param {string | number} value - The value
 * @param {Record<string, string>} escapes - The escapes of the characters it can't hold
 * @returns {string}
 */
const escapeCommandValue = (value, escapes) =>
  String(value).replace(
    /[%\r\n:,]/g,
    character => escapes[character] ?? character
  );

/**
 * Logs messages to GitHub Actions as workflow commands, with the file and
 * lines they're about, for them to annotate.
 *
 * @see https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-commands
 * @param {import('../types').TransportContext} context
 * @returns {void}
 */
const github = ({ level, message, timestamp, metadata = {}, module }) => {
  const { file } = metadata;

  const time = prettifyTimestamp(timestamp);

  const prettyLevel = prettifyLevel(level);

  const logMessage = `[${time}] ${prettyLevel}${module ? ` (${module})` : ''}: ${message}`;

  const command = levelToGitHubCommand[level] ?? 'notice';

  const data = escapeCommandValue(logMessage, commandDataEscapes);

  // Debug messages take no properties
  if (command === 'debug') {
    process.stdout.write(`::debug::${data}${EOL}`);

    return;
  }

  const properties = {
    file: file?.path,
    line: file?.position?.start.line,
    endLine: file?.position?.end.line,
  };

  const annotations = [];

  for (const [key, value] of Object.entries(properties)) {
    if (value) {
      annotations.push(
        `${key}=${escapeCommandValue(value, commandPropertyEscapes)}`
      );
    }
  }

  process.stdout.write(`::${command} ${annotations.join(',')}::${data}${EOL}`);
};

export default github;
