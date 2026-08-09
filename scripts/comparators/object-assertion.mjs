import assert from 'node:assert';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { BASE, HEAD } from '../constants.mjs';
import { pairOutputFiles } from './files.mjs';
import { comparePerformance } from './performance.mjs';
import { count, isRename, pairName, report } from './report.mjs';

const pairs = await pairOutputFiles(BASE, HEAD);

export const details = (summary, diff) =>
  `<details>\n<summary>${summary}</summary>\n\n\`\`\`diff\n${diff}\n\`\`\`\n\n</details>`;

const getFileDiff = async pair => {
  const { base, head, identical } = pair;

  if (!base) {
    return `- \`${head}\` added`;
  }

  if (!head) {
    return `- \`${base}\` removed`;
  }

  // The pair was matched on its bytes, so parsing it could only prove what the
  // hashes already did.
  if (identical) {
    return null;
  }

  const baseContent = JSON.parse(await readFile(join(BASE, base), 'utf-8'));
  const headContent = JSON.parse(await readFile(join(HEAD, head), 'utf-8'));

  try {
    assert.deepStrictEqual(headContent, baseContent);
    return null;
  } catch ({ message }) {
    return details(pairName(pair), message);
  }
};

const results = await Promise.all(
  pairs.map(async pair => ({ pair, diff: await getFileDiff(pair) }))
);

const differences = results.filter(({ diff }) => diff).map(({ diff }) => diff);

// A rename whose contents survived is already spelled out beside its diff, so
// only the ones carrying no other news are counted here.
const renamed = results.filter(({ pair, diff }) => !diff && isRename(pair));

const sections = [];
if (differences.length || renamed.length) {
  const summary = [
    differences.length &&
      count(differences.length, 'file differs', 'files differ'),
    renamed.length && `${count(renamed.length, 'file', 'files')} renamed`,
  ].filter(Boolean);

  sections.push(
    `**Output:** ${summary.join(' · ')}`,
    ...(differences.length ? [differences.join('\n')] : [])
  );
}

report(sections, await comparePerformance());
