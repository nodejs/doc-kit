#!/usr/bin/env node

// Assembles `www/content/` — the input tree for the doc-kit documentation
// site — from three sources that live elsewhere in the repo:
//
//   www/pages/*.md              authored narrative pages, copied verbatim
//   docs/*.md                   the existing reference docs
//   src/generators/*/README.md  per-generator config reference
//
// `www/content/` is a build artifact and is gitignored. Run this before
// invoking the `web` generator against it.

import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT = join(ROOT, 'www', 'content');

/**
 * Collects the `{ name, markdown }` pages to write into `www/content/`.
 *
 * @returns {Promise<Array<{ name: string, markdown: string }>>}
 */
const collectPages = async () => {
  const pages = [];

  const pagesDir = join(ROOT, 'www', 'pages');
  for (const file of await readdir(pagesDir)) {
    if (file.endsWith('.md')) {
      pages.push({
        name: file,
        markdown: await readFile(join(pagesDir, file), 'utf-8'),
      });
    }
  }

  const docsDir = join(ROOT, 'docs');
  for (const file of await readdir(docsDir)) {
    if (file.endsWith('.md')) {
      pages.push({
        name: file,
        markdown: await readFile(join(docsDir, file), 'utf-8'),
      });
    }
  }

  const generatorsDir = join(ROOT, 'src', 'generators');
  for (const generator of await readdir(generatorsDir, {
    withFileTypes: true,
  })) {
    if (!generator.isDirectory()) {
      continue;
    }

    const readme = join(generatorsDir, generator.name, 'README.md');

    try {
      pages.push({
        name: `generator-${generator.name}.md`,
        markdown: await readFile(readme, 'utf-8'),
      });
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
  }

  return pages;
};

const pages = await collectPages();

await rm(CONTENT, { recursive: true, force: true });
await mkdir(CONTENT, { recursive: true });

await Promise.all(
  pages.map(({ name, markdown }) => writeFile(join(CONTENT, name), markdown))
);

console.log(`Wrote ${pages.length} pages to www/content/`);
