import assert from 'node:assert';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { BASE, BENCHMARK_FILE, HEAD, TITLE } from '../constants.mjs';
import { comparePerformance } from './performance.mjs';

const [baseFiles, headFiles] = await Promise.all(
  [BASE, HEAD].map(async directory =>
    (await readdir(directory)).filter(file => file !== BENCHMARK_FILE)
  )
);
const baseFileSet = new Set(baseFiles);
const headFileSet = new Set(headFiles);
const files = [...new Set([...baseFiles, ...headFiles])];

export const details = (summary, diff) =>
  `<details>\n<summary>${summary}</summary>\n\n\`\`\`diff\n${diff}\n\`\`\`\n\n</details>`;

const getFileDiff = async file => {
  if (!baseFileSet.has(file)) {
    return `- \`${file}\` added`;
  }

  if (!headFileSet.has(file)) {
    return `- \`${file}\` removed`;
  }

  const basePath = join(BASE, file);
  const headPath = join(HEAD, file);

  const baseContent = JSON.parse(await readFile(basePath, 'utf-8'));
  const headContent = JSON.parse(await readFile(headPath, 'utf-8'));

  try {
    assert.deepStrictEqual(headContent, baseContent);
    return null;
  } catch ({ message }) {
    return details(file, message);
  }
};

const results = await Promise.all(files.map(getFileDiff));

const filteredResults = results.filter(Boolean);

const sections = [];
if (filteredResults.length) {
  sections.push(
    `**Output:** ${filteredResults.length} ${filteredResults.length === 1 ? 'file differs' : 'files differ'}`,
    filteredResults.join('\n')
  );
}

const performance = await comparePerformance();
if (performance) {
  sections.push(performance);
}

if (sections.length) {
  console.log(`${TITLE}\n\n${sections.join('\n\n')}\n`);
}
