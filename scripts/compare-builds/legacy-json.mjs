import assert from 'node:assert';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { BASE, HEAD } from './utils.mjs';

const files = await readdir(BASE);

const results = await Promise.all(
  files.map(async file => {
    const basePath = join(BASE, file);
    const headPath = join(HEAD, file);

    const baseContent = JSON.parse(await readFile(basePath, 'utf-8'));
    const headContent = JSON.parse(await readFile(headPath, 'utf-8'));

    try {
      assert.deepStrictEqual(baseContent, headContent);
      return null;
    } catch ({ message }) {
      return `<details>\n<summary>${file}</summary>\n\n\`\`\`diff\n${message}\n\`\`\`\n\n</details>`;
    }
  })
);

const filteredResults = results.filter(Boolean);

if (filteredResults.length) {
  console.log('## `legacy-json` generator');
  filteredResults.forEach(o => console.log(o));
}
