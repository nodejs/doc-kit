'use strict';

import { debug, notice, warning, error } from '@actions/core';

import { LogLevel } from '../constants.mjs';
import { prettifyLevel } from '../utils/colors.mjs';
import { prettifyTimestamp } from '../utils/time.mjs';

const actions = {
  [LogLevel.debug]: debug,
  [LogLevel.info]: notice,
  [LogLevel.warn]: warning,
  [LogLevel.error]: error,
  [LogLevel.fatal]: error,
};

/**
 * Logs messages to GitHub Actions with formatted output and file info with
 * appropriate gh actions based on level.
 *
 * @param {import('../types').TransportContext} context
 * @returns {void}
 */
const github = ({ level, message, timestamp, metadata = {}, module }) => {
  const { file } = metadata;

  const time = prettifyTimestamp(timestamp);

  const prettyLevel = prettifyLevel(level);

  const logMessage = `[${time}] ${prettyLevel}${module ? ` (${module})` : ''}: ${message}`;

  const logFn = actions[level] ?? notice;

  logFn(logMessage, {
    file: file?.path,
    startLine: file?.position?.start.line,
    endLine: file?.position?.end.line,
  });
};

export default github;
