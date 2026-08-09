import { stat } from 'node:fs/promises';
import path from 'node:path';

import { BASE, HEAD } from '../constants.mjs';
import { pairOutputFiles } from './files.mjs';
import { comparePerformance } from './performance.mjs';
import { count, isRename, pairName, report } from './report.mjs';

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

const sizeOf = async (directory, file) =>
  file ? (await stat(path.join(directory, file))).size : 0;

const entries = await Promise.all(
  (await pairOutputFiles(BASE, HEAD)).map(async pair => {
    const [base, head] = await Promise.all([
      sizeOf(BASE, pair.base),
      sizeOf(HEAD, pair.head),
    ]);

    return { ...pair, baseSize: base, headSize: head, diff: head - base };
  })
);

// A renamed file that weighs the same weighs the same: its hash turned over,
// which earns a line but not a row among the real size movements.
const renamed = entries.filter(entry => isRename(entry) && !entry.diff);

// Find files whose presence or size changed, then show the largest changes first.
const changed = entries
  .filter(({ base, head, diff }) => diff || !base || !head)
  .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));

const sections = [];

// Output markdown table if there are changes
if (changed.length || renamed.length) {
  const totalDiff = changed.reduce((total, { diff }) => total + diff, 0);
  const totalSign = totalDiff > 0 ? '+' : '';

  const rows = changed.map(entry => {
    const { base, head, baseSize, headSize, diff } = entry;
    const sign = diff > 0 ? '+' : '';
    const percent =
      baseSize === 0
        ? ''
        : ` (${sign}${((diff / baseSize) * 100).toFixed(1)}%)`;
    const diffFormatted = `${sign}${formatBytes(diff)}${percent}`;

    return `| \`${pairName(entry)}\` | ${base ? formatBytes(baseSize) : '—'} | ${head ? formatBytes(headSize) : '—'} | ${diffFormatted} |`;
  });

  const summary = [
    changed.length &&
      `${count(changed.length, 'file', 'files')} changed · net ${totalSign}${formatBytes(totalDiff)}`,
    renamed.length && `${count(renamed.length, 'file', 'files')} renamed`,
  ].filter(Boolean);

  const details = [
    changed.length &&
      [
        '| File | Main | PR | Change |',
        '| --- | ---: | ---: | ---: |',
        rows.join('\n'),
      ].join('\n'),
    renamed.length &&
      [
        '**Renamed** <sub>(identical contents unless noted)</sub>',
        renamed
          .map(
            entry =>
              `- \`${pairName(entry)}\`${entry.identical ? '' : ' <sub>(same size, different contents)</sub>'}`
          )
          .join('\n'),
      ].join('\n'),
  ].filter(Boolean);

  sections.push(
    [
      `**Output size:** ${summary.join(' · ')}`,
      '',
      '<details>',
      '<summary>File size details</summary>',
      '',
      details.join('\n\n'),
      '',
      '</details>',
    ].join('\n')
  );
}

report(sections, await comparePerformance());
