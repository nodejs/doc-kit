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

  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    fractionalSecondDigits: 3,
  }).format(date);
};
