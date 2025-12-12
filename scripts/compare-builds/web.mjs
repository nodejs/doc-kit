import { stat, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = fileURLToPath(import.meta.resolve('../../out/base'));
const HEAD = fileURLToPath(import.meta.resolve('../../out/head'));
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
 * Formats the difference between base and head sizes
 * @param {number} base - Base file size in bytes
 * @param {number} head - Head file size in bytes
 * @returns {string} Formatted diff string (e.g., "+1.50 KB (+10.00%)")
 */
const formatDiff = (base, head) => {
  const diff = head - base;
  const sign = diff > 0 ? '+' : '';
  const percent = base ? `${sign}${((diff / base) * 100).toFixed(2)}%` : 'N/A';
  return `${sign}${formatBytes(diff)} (${percent})`;
};

/**
 * Gets all files in a directory with their stats
 * @param {string} dir - Directory path to search
 * @returns {Promise<Map<string, number>>} Map of filename to size
 */
const getDirectoryStats = async dir => {
  const files = await readdir(dir);
  const entries = await Promise.all(
    files.map(async file => [file, (await stat(path.join(dir, file))).size])
  );
  return new Map(entries);
};

/**
 * Generates a table row for a file
 * @param {string} file - Filename
 * @param {number} baseSize - Base size in bytes
 * @param {number} headSize - Head size in bytes
 * @returns {string} Markdown table row
 */
const generateRow = (file, baseSize, headSize) => {
  const baseCol = formatBytes(baseSize);
  const headCol = formatBytes(headSize);
  const diffCol = formatDiff(baseSize, headSize);

  return `| \`${file}\` | ${baseCol} | ${headCol} | ${diffCol} |`;
};

/**
 * Generates a markdown table
 * @param {string[]} files - List of files
 * @param {Map<string, number>} baseStats - Base stats map
 * @param {Map<string, number>} headStats - Head stats map
 * @returns {string} Markdown table
 */
const generateTable = (files, baseStats, headStats) => {
  const header = '| File | Base | Head | Diff |\n|------|------|------|------|';
  const rows = files.map(f =>
    generateRow(f, baseStats.get(f), headStats.get(f))
  );
  return `${header}\n${rows.join('\n')}`;
};

/**
 * Wraps content in a details/summary element
 * @param {string} summary - Summary text
 * @param {string} content - Content to wrap
 * @returns {string} Markdown details element
 */
const details = (summary, content) =>
  `<details>\n<summary>${summary}</summary>\n\n${content}\n\n</details>`;

const [baseStats, headStats] = await Promise.all(
  [BASE, HEAD].map(getDirectoryStats)
);

const allFiles = Array.from(
  new Set([...baseStats.keys(), ...headStats.keys()])
);

// Filter to only changed files (exist in both and have different sizes)
const changedFiles = allFiles.filter(
  f =>
    baseStats.has(f) &&
    headStats.has(f) &&
    baseStats.get(f) !== headStats.get(f)
);

if (changedFiles.length) {
  // Separate HTML files and their matching JS files from other files
  const pages = [];
  const other = [];

  // Get all HTML base names
  const htmlBaseNames = new Set(
    changedFiles
      .filter(f => path.extname(f) === '.html')
      .map(f => path.basename(f, '.html'))
  );

  for (const file of changedFiles) {
    const ext = path.extname(file);
    const basename = path.basename(file, ext);

    // All HTML files go to pages
    if (ext === '.html') {
      pages.push(file);
    }
    // JS files go to pages only if they have a matching HTML file
    else if (ext === '.js' && htmlBaseNames.has(basename)) {
      pages.push(file);
    }
    // Everything else goes to other
    else {
      other.push(file);
    }
  }

  pages.sort();
  other.sort();

  console.log('## Web Generator\n');

  if (other.length) {
    console.log(generateTable(other, baseStats, headStats));
  }

  if (pages.length) {
    console.log(
      details(
        `Pages (${pages.filter(f => path.extname(f) === '.html').length})`,
        generateTable(pages, baseStats, headStats)
      )
    );
  }
}
