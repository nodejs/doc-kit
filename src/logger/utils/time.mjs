'use strict';

/**
 * Formats a Unix timestamp in milliseconds as a human-readable time string
 * in UTC timezone for CLI output.
 *
 * @param {number} timestamp
 * @returns {string}
 */
export const prettifyTimestamp = timestamp => {
  const date = new Date(timestamp);

  const hours = date.getUTCHours().toString().padStart(2, '0');
  const minutes = date.getUTCMinutes().toString().padStart(2, '0');
  const seconds = date.getUTCSeconds().toString().padStart(2, '0');
  const milliseconds = date.getUTCMilliseconds().toString().padStart(3, '0');

  return `${hours}:${minutes}:${seconds}.${milliseconds}`;
};
