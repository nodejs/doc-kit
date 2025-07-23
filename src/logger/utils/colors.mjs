'use strict';

import { styleText } from 'node:util';

import { levelTags, levelToColorMap } from '../constants.mjs';

/**
 * Returns a styled, uppercase log level tag for CLI output with color mapping
 * for better readability.
 *
 * @param {number} level
 * @returns {string}
 */
export const prettifyLevel = level => {
  const tag = levelTags[level] ?? String(level);

  return styleText(levelToColorMap[level], tag.toUpperCase());
};
