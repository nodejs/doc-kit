'use strict';

import * as core from '@actions/core';

import { LogLevel } from '../constants.mjs';
import { prettifyLevel } from '../utils/colors.mjs';
import { prettifyTimestamp } from '../utils/time.mjs';

const actions = {
  [LogLevel.debug]: core.debug,
  [LogLevel.info]: core.notice,
  [LogLevel.warn]: core.warning,
  [LogLevel.error]: core.error,
  [LogLevel.fatal]: core.error,
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

  const logFn = actions[level] ?? core.notice;

  logFn(logMessage, {
    file: file?.path,
    startLine: file?.position?.start.line,
    endLine: file?.position?.end.line,
  });
};

export default github;
