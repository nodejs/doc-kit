import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { BASE, BENCHMARK_FILE, HEAD } from '../constants.mjs';

const UNITS = ['B', 'KB', 'MB', 'GB'];

const formatBytes = bytes => {
  if (!bytes) {
    return '0 B';
  }

  const unit = Math.min(
    Math.floor(Math.log(Math.abs(bytes)) / Math.log(1024)),
    UNITS.length - 1
  );
  return `${(bytes / Math.pow(1024, unit)).toFixed(2)} ${UNITS[unit]}`;
};

const formatSeconds = seconds =>
  Math.abs(seconds) < 1
    ? `${(seconds * 1_000).toFixed(2)} ms`
    : `${seconds.toFixed(2)} s`;

const formatPercent = (base, diff) => {
  if (base === 0) {
    return 'n/a';
  }

  return `${Math.abs((diff / base) * 100).toFixed(1)}%`;
};

const formatChange = (base, head, { increase, decrease }) => {
  const diff = head - base;

  if (diff === 0) {
    return 'unchanged';
  }

  return `${formatPercent(base, diff)} ${diff > 0 ? increase : decrease}`;
};

const readBenchmark = async directory => {
  try {
    return JSON.parse(
      await readFile(path.join(directory, BENCHMARK_FILE), 'utf8')
    );
  } catch (error) {
    if (error.code === 'ENOENT') {
      return null;
    }

    throw error;
  }
};

const METRICS = [
  {
    label: 'Generation time',
    value: benchmark => benchmark.elapsedSeconds,
    format: formatSeconds,
    change: { increase: 'slower', decrease: 'faster' },
  },
  {
    label: 'Peak memory',
    value: benchmark => benchmark.maxRssKiB * 1024,
    format: formatBytes,
    change: { increase: 'higher', decrease: 'lower' },
  },
];

/**
 * Builds a Markdown comparison of generation performance.
 *
 * Missing benchmark files are expected while artifacts created before
 * performance measurement are still being used as the comparison base.
 *
 * @param {string} baseDirectory - Base artifact directory
 * @param {string} headDirectory - Head artifact directory
 * @returns {Promise<string>} Markdown table, or an empty string
 */
export const comparePerformance = async (
  baseDirectory = BASE,
  headDirectory = HEAD
) => {
  const [base, head] = await Promise.all(
    [baseDirectory, headDirectory].map(readBenchmark)
  );

  if (!base || !head) {
    return '';
  }

  const rows = METRICS.map(({ label, value, format, change }) => {
    const baseValue = value(base);
    const headValue = value(head);

    if (!Number.isFinite(baseValue) || !Number.isFinite(headValue)) {
      throw new TypeError(`Invalid ${label.toLowerCase()} benchmark value`);
    }

    return `- **${label}:** ${formatChange(baseValue, headValue, change)} (${format(baseValue)} → ${format(headValue)})`;
  });

  return ['**Performance estimate** <sub>(single CI run)</sub>', ...rows].join(
    '\n'
  );
};
