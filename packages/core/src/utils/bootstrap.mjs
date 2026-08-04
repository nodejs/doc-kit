'use strict';

import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Directory names commonly used for documentation, in preference order.
 */
const DOCS_DIR_CANDIDATES = ['docs', 'doc', 'documentation'];

/**
 * Configuration file names that mark a project as already set up
 * (the subset of cosmiconfig's search places doc-kit users encounter).
 */
const CONFIG_FILE_NAMES = [
  'doc-kit.config.mjs',
  'doc-kit.config.js',
  'doc-kit.config.cjs',
  '.doc-kitrc',
  '.doc-kitrc.json',
  '.doc-kitrc.mjs',
  '.doc-kitrc.js',
];

/**
 * A minimal, spec-shaped starter document so a fresh project has something
 * to render immediately.
 */
export const STARTER_DOC = `# hello

A one-line description of the module.

## \`hello.greet(name)\`

- \`name\` {string} The name to greet.
- Returns: {string}

Greets \`name\`.
`;

/**
 * Whether a directory contains any Markdown files (at any depth).
 *
 * @param {string} directory - The directory to inspect
 * @returns {boolean}
 */
export const hasMarkdown = directory => {
  try {
    return readdirSync(directory, { recursive: true }).some(entry =>
      String(entry).endsWith('.md')
    );
  } catch {
    return false;
  }
};

/**
 * Finds an existing doc-kit configuration file in a directory.
 *
 * @param {string} directory - The project directory
 * @returns {string | undefined} The file name, if one exists
 */
export const findExistingConfig = directory =>
  CONFIG_FILE_NAMES.find(name => existsSync(join(directory, name)));

/**
 * Picks the documentation directory for a project: the first conventional
 * directory that already holds Markdown, then the first that exists, and
 * finally `docs` for a fresh start.
 *
 * @param {string} directory - The project directory
 * @returns {string} The documentation directory, relative to the project
 */
export const detectDocsDirectory = directory => {
  const existing = DOCS_DIR_CANDIDATES.filter(candidate =>
    existsSync(join(directory, candidate))
  );

  return (
    existing.find(candidate => hasMarkdown(join(directory, candidate))) ??
    existing[0] ??
    DOCS_DIR_CANDIDATES[0]
  );
};

/**
 * Builds the contents of a starter `doc-kit.config.mjs`. Naming and
 * versioning are imported from `package.json` so they never drift from the
 * project.
 *
 * @param {object} options
 * @param {string[]} options.targets - Generator targets
 * @param {string} options.docsDir - The documentation directory
 * @param {string} options.output - The output directory
 * @param {boolean} options.hasHomepage - Whether `package.json` declares a
 * `homepage` to use as the site's base URL
 * @returns {string} The configuration file source
 */
export const buildConfigSource = ({
  targets,
  docsDir,
  output,
  hasHomepage,
}) => {
  const baseURL = hasHomepage
    ? `
    // The public URL of the published site, used for absolute links,
    // sitemaps, and llms.txt
    baseURL: packageJson.homepage,`
    : `
    // Set to the public URL of the published site to enable absolute links,
    // sitemaps, and llms.txt page URLs
    // baseURL: 'https://example.com/docs',`;

  return `import packageJson from './package.json' with { type: 'json' };

/** @type {import('@nodejs/doc-kit/utils/configuration/types').Configuration} */
export default {
  target: ${JSON.stringify(targets)},

  global: {
    // Naming and versioning follow package.json
    project: packageJson.name,
    version: packageJson.version,

    input: [${JSON.stringify(`${docsDir}/**/*.md`)}],
    output: ${JSON.stringify(output)},
${baseURL}
  },
};
`;
};

/**
 * Adds the output directory to `.gitignore` contents when it is not already
 * ignored.
 *
 * @param {string | undefined} contents - The current `.gitignore` contents,
 * if the file exists
 * @param {string} output - The output directory
 * @returns {string | undefined} The new contents, or `undefined` when no
 * change is needed
 */
export const addIgnoredOutput = (contents, output) => {
  const lines = (contents ?? '').split('\n').map(line => line.trim());

  if (lines.includes(output) || lines.includes(`${output}/`)) {
    return undefined;
  }

  const existing = contents ? `${contents.replace(/\n?$/, '\n')}\n` : '';

  return `${existing}# doc-kit output\n${output}/\n`;
};
