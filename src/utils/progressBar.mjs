'use strict';

import { PassThrough } from 'node:stream';

import { SingleBar, Presets } from 'cli-progress';

/**
 * Creates a progress bar for the generation pipeline.
 * Writes to stderr to avoid conflicts with the logger (stdout).
 * When disabled or stderr is not a TTY (e.g. CI), output is sent
 * to a PassThrough stream (silently discarded).
 *
 * @param {object} [options]
 * @param {boolean} [options.enabled=true] Whether to render the progress bar
 * @returns {SingleBar}
 */
const createProgressBar = ({ enabled = true } = {}) => {
  const shouldEnable = enabled && process.stderr.isTTY;

  return new SingleBar(
    {
      stream: shouldEnable ? process.stderr : new PassThrough(),
      format: '  {phase} [{bar}] {percentage}% | {value}/{total}',
      hideCursor: true,
      clearOnComplete: false,
    },
    Presets.shades_grey
  );
};

export default createProgressBar;
