'use strict';

import { SingleBar, Presets } from 'cli-progress';

/**
 * Creates a progress bar for the generation pipeline.
 * Writes to stderr to avoid conflicts with the logger (stdout).
 * Returns a no-op object if disabled or if stderr is not a TTY (e.g. CI).
 *
 * @param {object} [options]
 * @param {boolean} [options.enabled=true] Whether to render the progress bar
 * @returns {{ start: (total: number) => void, increment: (phase: string) => void, stop: () => void }}
 */
const createProgressBar = ({ enabled = true } = {}) => {
  if (!enabled || !process.stderr.isTTY) {
    return {
      /** @returns {void} */
      start: () => {},
      /** @returns {void} */
      increment: () => {},
      /** @returns {void} */
      stop: () => {},
    };
  }

  const bar = new SingleBar(
    {
      stream: process.stderr,
      format: '  {phase} [{bar}] {percentage}% | {value}/{total}',
      hideCursor: true,
      clearOnComplete: false,
    },
    Presets.shades_grey
  );

  return {
    /** @param {number} total */
    start: total => bar.start(total, 0, { phase: 'Starting...' }),
    /** @param {string} phase */
    increment: phase => bar.increment({ phase }),
    /** @returns {void} */
    stop: () => bar.stop(),
  };
};

export default createProgressBar;
