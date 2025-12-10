'use strict';

import { styleText } from 'node:util';

import { prettifyLevel } from '../utils/colors.mjs';
import { prettifyTimestamp } from '../utils/time.mjs';

/**
 * Logs a formatted message to stdout for human-friendly CLI output.
 *
 * @param {import('../types').TransportContext} context
 * @returns {void}
 */
const console = ({ level, message, timestamp, metadata = {}, module }) => {
  const { file, stack, ...rest } = metadata;

  const time = prettifyTimestamp(timestamp);

  process.stdout.write(`[${time}]`);

  const prettyLevel = prettifyLevel(level);

  process.stdout.write(` ${prettyLevel}`);

  if (module) {
    process.stdout.write(` (${module})`);
  }

  process.stdout.write(`: ${message}`);

  if (file) {
    process.stdout.write(` at ${file.path}`);
  }

  if (file?.position) {
    const position = `(${file.position.start.line}:${file.position.end.line})`;

    process.stdout.write(position);
  }

  // Print remaining metadata inline in purple
  if (Object.keys(rest).length > 0) {
    const metaStr = styleText('magenta', JSON.stringify(rest));
    process.stdout.write(` ${metaStr}`);
  }

  process.stdout.write('\n');

  if (stack) {
    process.stdout.write(stack);
  }
};

export default console;
