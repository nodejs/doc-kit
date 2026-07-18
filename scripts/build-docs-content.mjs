#!/usr/bin/env node

// Assembles `www/content/` — the input tree for the doc-kit documentation
// site — from three sources that live elsewhere in the repo:
//
//   www/pages/*.md              authored narrative pages, copied verbatim
//   docs/*.md                   the existing reference docs
//   src/generators/*/README.md  per-generator config reference, written to
//                               `generators/<name>.md`
//
// `www/content/` is a build artifact and is gitignored. Run this before
// invoking the `web` generator against it.

import { glob, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';

const ROOT = join(import.meta.dirname, '..');
const CONTENT = join(ROOT, 'www', 'content');

const SOURCES = [
  { pattern: 'www/pages/*.md', rename: basename },
  { pattern: 'docs/*.md', rename: basename },
  {
    pattern: 'src/generators/*/README.md',
    rename: file => `generators/${basename(dirname(file))}.md`,
  },
];

/**
 * Collects the `{ name, markdown }` pages to write into `www/content/`.
 *
 * @returns {Promise<Array<{ name: string, markdown: string }>>}
 */
const collectPages = async () => {
  const groups = await Promise.all(
    SOURCES.map(async ({ pattern, rename }) => {
      const files = await Array.fromAsync(glob(pattern, { cwd: ROOT }));

      return Promise.all(
        files.sort().map(async file => ({
          name: rename(file),
          markdown: await readFile(join(ROOT, file), 'utf-8'),
        }))
      );
    })
  );

  return groups.flat();
};

const pages = await collectPages();

await rm(CONTENT, { recursive: true, force: true });

await Promise.all(
  [...new Set(pages.map(({ name }) => dirname(join(CONTENT, name))))].map(dir =>
    mkdir(dir, { recursive: true })
  )
);

await Promise.all(
  pages.map(({ name, markdown }) => writeFile(join(CONTENT, name), markdown))
);

console.log(`Wrote ${pages.length} pages to www/content/`);
