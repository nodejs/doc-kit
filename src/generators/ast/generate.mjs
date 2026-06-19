'use strict';

import { readFile } from 'node:fs/promises';
import { relative, sep } from 'node:path/posix';

import globParent from 'glob-parent';
import { globSync } from 'tinyglobby';
import { parse as parseYaml } from 'yaml';

import { STABILITY_INDEX_URL } from './constants.mjs';
import getConfig from '../../utils/configuration/index.mjs';
import { withExt } from '../../utils/file.mjs';
import { QUERIES } from '../../utils/queries/index.mjs';
import { getRemark as remark, getRemarkMdx } from '../../utils/remark.mjs';

/**
 * Determines whether a file should be parsed as MDX. A `.mdx` extension opts in
 * by default, but an explicit `mdx` boolean in the file's `---` frontmatter
 * always takes precedence (so a `.md` file can opt in, or a `.mdx` file out).
 *
 * @param {string} path - Absolute file path
 * @param {string} content - Raw file contents
 * @returns {boolean}
 */
const isMdxFile = (path, content) => {
  const frontmatter = QUERIES.standardYamlFrontmatter.exec(content);

  if (frontmatter) {
    try {
      const { mdx } = parseYaml(frontmatter[1]) ?? {};

      if (typeof mdx === 'boolean') {
        return mdx;
      }
    } catch {
      // Node.js core docs use a non-standard frontmatter dialect that may fail
      // to parse here; fall back to the extension check below.
    }
  }

  return path.endsWith('.mdx');
};

/**
 * Process a chunk of markdown files in a worker thread.
 * Loads and parses markdown files into AST representations.
 *
 * @type {import('./types').Generator['processChunk']}
 */
export async function processChunk(inputSlice, itemIndices) {
  const filePaths = itemIndices.map(idx => inputSlice[idx]);

  const results = [];

  for (const [path, parent] of filePaths) {
    const content = await readFile(path, 'utf-8');

    const mdx = isMdxFile(path, content);

    // Stability indexes become links in both modes.
    const withStabilityLinks = content.replace(
      QUERIES.stabilityIndexPrefix,
      match => `[${match}](${STABILITY_INDEX_URL})`
    );

    // The path is the relative path minus the extension
    const relativePath = sep + withExt(relative(parent, path));

    let tree;

    if (mdx) {
      // A `<!-- -->` HTML comment is invalid MDX, so the frontmatter can't be
      // rewritten in-source. Strip it, parse as MDX, then re-attach it as the
      // YAML `html` node the metadata stage expects.
      const frontmatter = QUERIES.standardYamlFrontmatter.exec(content);
      const source = withStabilityLinks.replace(
        QUERIES.standardYamlFrontmatter,
        ''
      );

      tree = getRemarkMdx().parse(source);

      if (frontmatter) {
        tree.children.unshift({
          type: 'html',
          value: `<!-- YAML\n${frontmatter[1]}\n-->`,
        });
      }
    } else {
      const value = withStabilityLinks.replace(
        QUERIES.standardYamlFrontmatter,
        (_, yaml) => `<!-- YAML\n${yaml}\n-->`
      );

      tree = remark().parse(value);
    }

    results.push({ tree, path: relativePath, mdx });
  }

  return results;
}

/**
 * Generates AST trees from markdown input files.
 *
 * @type {import('./types').Generator['generate']}
 */
export async function* generate(_, worker) {
  const { ast: config } = getConfig();

  const files = config.input.flatMap(input => {
    const parent = globParent(input);

    return globSync(input, { ignore: config.ignore }).map(child => [
      child,
      parent,
    ]);
  });

  // Parse markdown files in parallel using worker threads
  for await (const chunkResult of worker.stream(files)) {
    yield chunkResult;
  }
}
