'use strict';

import cliProgress from 'cli-progress';

/**
 * @typedef {Object} ProgressBar
 * @property {(total: number) => void} start - Starts the bar for a known number of steps.
 * @property {(generatorName: string) => void} increment - Advances the bar by one step.
 * @property {() => void} stop - Stops and clears the bar.
 */

/**
 * Creates a progress bar for tracking generator pipeline progress in the CLI.
 *
 * Rendering is skipped when stdout is not a TTY (CI logs, piped output, tests)
 * so non-interactive output never receives raw escape codes or bar frames.
 *
 * @returns {ProgressBar}
 */
const createProgressBar = () => {
  if (!process.stdout.isTTY) {
    /**
     * No-op progress bar used when rendering would produce unusable output.
     *
     * @type {ProgressBar}
     */
    const noopProgressBar = {
      /** No-op start. */
      start() {},
      /** No-op increment. */
      increment() {},
      /** No-op stop. */
      stop() {},
    };

    return noopProgressBar;
  }

  const bar = new cliProgress.SingleBar(
    {
      format:
        'Generating docs |{bar}| {percentage}% | {value}/{total} generators | {generator}',
      hideCursor: true,
      clearOnComplete: true,
    },
    cliProgress.Presets.shades_classic
  );

  /**
   * Starts the bar for a known number of steps.
   *
   * @param {number} total - Total number of generators to be run.
   */
  const start = total => {
    bar.start(total, 0, { generator: 'N/A' });
  };

  /**
   * Advances the bar by one step.
   *
   * @param {string} generatorName - Name of the generator that just completed.
   */
  const increment = generatorName => {
    bar.increment({ generator: generatorName });
  };

  /**
   * Stops and clears the bar.
   */
  const stop = () => {
    bar.stop();
  };

  return { start, increment, stop };
};

export default createProgressBar;
