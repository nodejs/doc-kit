'use strict';

import { SingleBar, Presets } from 'cli-progress';

/**
 * Creates a progress bar for the generation pipeline.
 * Writes to stderr to avoid conflicts with the logger (stdout).
 * Returns a no-op object if disabled or if stderr is not a TTY (e.g. CI).
 *
 * @param {object} [options]
 * @param {boolean} [options.enabled=true] Whether to render the progress bar
 * @returns {SingleBar | null}
 */
const createProgressBar = ({ enabled = true } = {}) => {
  if (!enabled || !process.stderr.isTTY) {
    return null;
  }

  return new SingleBar(
    {
      stream: process.stderr,
      format: '  {phase} [{bar}] {percentage}% | {value}/{total}',
      hideCursor: true,
      clearOnComplete: false,
    },
    Presets.shades_grey
  );
};

export default createProgressBar;
