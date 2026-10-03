'use strict';

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import getConfig from '@doc-kit/core/utils/configuration/index.mjs';
import { populate } from '@doc-kit/core/utils/configuration/templates.mjs';
import { writeFile } from '@doc-kit/core/utils/file.mjs';

import { buildApiDocLink } from './utils/buildApiDocLink.mjs';
import { buildPages } from './utils/buildPages.mjs';

/**
 * Generates a llms.txt file, and optionally the Markdown of every page
 * (`writeMarkdown`, at the `.md` URLs llms.txt links by default) and a
 * llms-full.txt file holding them all (`writeFull`).
 *
 * @type {import('./types').Generator['generate']}
 */
export async function generate(input) {
  const config = getConfig('llms-txt');

  const template = await readFile(config.templatePath, 'utf-8');

  const apiDocsLinks = input
    .filter(entry => entry.heading.depth === 1 && entry.heading.data.text)
    .map(entry => `- ${buildApiDocLink(entry, config)}`)
    .join('\n');

  const filledTemplate = `${populate(template, config)}${apiDocsLinks}`;

  if (!config.output) {
    return filledTemplate;
  }

  await writeFile(join(config.output, 'llms.txt'), filledTemplate);

  if (!config.writeMarkdown && !config.writeFull) {
    return filledTemplate;
  }

  const pages = buildPages(input);

  if (config.writeMarkdown) {
    await Promise.all(
      pages.map(({ path, markdown }) =>
        writeFile(join(config.output, `${path}.md`), markdown)
      )
    );
  }

  if (config.writeFull) {
    const full = pages.map(
      ({ path, markdown }) =>
        `---\nurl: ${populate(config.pageURL, { ...config, path })}\n---\n${markdown}`
    );

    await writeFile(join(config.output, 'llms-full.txt'), full.join('\n'));
  }

  return filledTemplate;
}
