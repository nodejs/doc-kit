'use strict';

/**
 * Formats a Unix timestamp in milliseconds as a human-readable time string for
 * CLI output.
 *
 * @param {number} timestamp
 * @returns {string}
 */
export const prettifyTimestamp = timestamp => {
  const date = new Date(timestamp);

  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  const milliseconds = date.getMilliseconds().toString().padStart(3, '0');

  return `${hours}:${minutes}:${seconds}.${milliseconds}`;
};
