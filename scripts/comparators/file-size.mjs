import { stat } from 'node:fs/promises';
import path from 'node:path';

import { BASE, HEAD, TITLE } from '../constants.mjs';
import { listOutputFiles } from './files.mjs';
import { comparePerformance } from './performance.mjs';

const UNITS = ['B', 'KB', 'MB', 'GB'];

/**
 * Formats bytes into human-readable format
 * @param {number} bytes - Number of bytes
 * @returns {string} Formatted string (e.g., "1.50 KB")
 */
const formatBytes = bytes => {
  if (!bytes) {
    return '0 B';
  }

  const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${UNITS[i]}`;
};

/**
 * Gets all files in a directory with their sizes
 * @param {string} dir - Directory path to scan
 * @returns {Promise<Map<string, number>>} Map of filename to size in bytes
 */
const getStats = async dir => {
  const files = await listOutputFiles(dir);
  return new Map(
    await Promise.all(
      files.map(async f => [f, (await stat(path.join(dir, f))).size])
    )
  );
};

// Fetch stats for both directories in parallel
const [baseStats, headStats] = await Promise.all([BASE, HEAD].map(getStats));

const didChange = f => baseStats.get(f) !== headStats.get(f);

const toDiffObject = f => ({
  file: f,
  base: baseStats.get(f) ?? 0,
  head: headStats.get(f) ?? 0,
  diff: (headStats.get(f) ?? 0) - (baseStats.get(f) ?? 0),
});

// Find files whose presence or size changed, then show the largest changes first.
const changed = [...new Set([...baseStats.keys(), ...headStats.keys()])]
  .filter(didChange)
  .map(toDiffObject)
  .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));

const sections = [];

// Output markdown table if there are changes
if (changed.length) {
  const totalDiff = changed.reduce((total, { diff }) => total + diff, 0);
  const totalSign = totalDiff > 0 ? '+' : '';
  const rows = changed.map(({ file, base, head, diff }) => {
    const sign = diff > 0 ? '+' : '';
    const percent =
      base === 0 ? '' : ` (${sign}${((diff / base) * 100).toFixed(1)}%)`;
    const diffFormatted = `${sign}${formatBytes(diff)}${percent}`;

    return `| \`${file}\` | ${baseStats.has(file) ? formatBytes(base) : '—'} | ${headStats.has(file) ? formatBytes(head) : '—'} | ${diffFormatted} |`;
  });

  sections.push(
    [
      `**Output size:** ${changed.length} ${changed.length === 1 ? 'file' : 'files'} changed · net ${totalSign}${formatBytes(totalDiff)}`,
      '',
      '<details>',
      '<summary>File size details</summary>',
      '',
      '| File | Main | PR | Change |',
      '| --- | ---: | ---: | ---: |',
      rows.join('\n'),
      '',
      '</details>',
    ].join('\n')
  );
}

const performance = await comparePerformance();
if (performance) {
  sections.push(performance);
}

if (sections.length) {
  console.log(`${TITLE}\n\n${sections.join('\n\n')}\n`);
}
