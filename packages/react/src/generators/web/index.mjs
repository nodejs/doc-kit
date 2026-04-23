'use strict';

import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join } from 'node:path';

import getConfig from '#core/utils/configuration/index.mjs';
import { writeFile } from '#core/utils/file.mjs';

import createASTBuilder from '../../utils/web/generate.mjs';
import { processJSXEntries } from '../../utils/web/processing.mjs';

export const name = 'web';
export const dependsOn = '@doc-kittens/react/jsx-ast';
export const defaultConfiguration = {
  templatePath: join(import.meta.dirname, 'template.html'),
  title: 'Node.js',
  imports: {
    '#theme/Logo': '@node-core/ui-components/Common/NodejsLogo',
    '#theme/Navigation': join(import.meta.dirname, './ui/components/NavBar'),
    '#theme/Sidebar': join(import.meta.dirname, './ui/components/SideBar'),
    '#theme/Metabar': join(import.meta.dirname, './ui/components/MetaBar'),
    '#theme/Footer': join(import.meta.dirname, './ui/components/NoOp'),
    '#theme/Layout': join(import.meta.dirname, './ui/components/Layout'),
  },
};

/**
 * Main generation function that processes JSX AST entries into web bundles.
 *
 * @type {import('./types').Generator['generate']}
 */
export async function generate(input) {
  const config = getConfig('web');

  const template = await readFile(config.templatePath, 'utf-8');

  // Create AST builders for server and client programs
  const astBuilders = createASTBuilder();

  // Create require function for resolving external packages in server code
  const requireFn = createRequire(import.meta.url);

  // Process all entries: convert JSX to HTML/CSS/JS
  const { results, css, chunks } = await processJSXEntries(
    input,
    template,
    astBuilders,
    requireFn,
    config
  );

  // Process all entries together (required for code-split bundles)
  if (config.output) {
    // Write HTML files
    for (const { html, path } of results) {
      await writeFile(join(config.output, `${path}.html`), html, 'utf-8');
    }

    // Write code-split JavaScript chunks
    for (const chunk of chunks) {
      await writeFile(join(config.output, chunk.fileName), chunk.code, 'utf-8');
    }

    // Write CSS bundle
    await writeFile(join(config.output, 'styles.css'), css, 'utf-8');
  }

  return results.map(({ html }) => ({ html: html.toString(), css }));
}
