'use strict';

import { join } from 'node:path';

import { DISABLED_SECTION } from '#incremental/section.mjs';
import getConfig from '#utils/configuration/index.mjs';
import { GITHUB_BLOB_URL, populate } from '#utils/configuration/templates.mjs';
import { readJSON, withExt, writeJSON } from '#utils/file.mjs';
import { groupNodesByModule } from '#utils/generators.mjs';

import { buildDocument } from './utils/document.mjs';
import { resolveSchemaURL } from './utils/schema.mjs';

/**
 * Builds the documents of a chunk of modules in a worker thread.
 *
 * @type {import('./types').Generator['processChunk']}
 */
export async function processChunk(slicedInput, itemIndices, dependencies) {
  return itemIndices.map(idx => {
    const { head, entries } = slicedInput[idx];

    return buildDocument(head, entries, dependencies);
  });
}

/**
 * Generates one JSON document per input file. An incremental build only
 * builds the modules that changed, and reads the other documents from the
 * files the previous build wrote.
 *
 * @type {import('./types').Generator['generate']}
 */
export async function* generate(
  input,
  worker,
  { incremental = DISABLED_SECTION } = {}
) {
  const config = getConfig('json');

  /** @type {import('./types').Dependencies} */
  const dependencies = {
    schemaURL: resolveSchemaURL(config),
    // Source links resolve against the repository, when one is configured
    sourceURL: config.repository ? populate(GITHUB_BLOB_URL, config) : null,
  };

  // Pages other generators added to the pipeline are theirs to render
  const entries = input.filter(entry => !entry.synthetic && !entry.chunk);

  // One item per module, so a worker gets everything a document needs
  const modules = [...groupNodesByModule(entries).values()].map(nodes => ({
    head: nodes.find(({ heading }) => heading.depth === 1) ?? nodes[0],
    entries: nodes,
  }));

  /**
   * Builds the modules' documents and writes each to its file.
   *
   * @param {AsyncIterable<typeof modules> | typeof modules} stale
   * @yields {Array<import('./types').Document>}
   */
  async function* build(stale) {
    for await (const chunk of worker.stream(stale, dependencies)) {
      if (config.output) {
        await Promise.all(
          chunk.map(document =>
            writeJSON(
              join(config.output, withExt(document.path, 'json')),
              document,
              config.minify
            )
          )
        );
      }

      yield chunk;
    }
  }

  yield* incremental.reuse(modules, build, {
    /** @param {(typeof modules)[number]} module */
    file: ({ head }) => withExt(head.path, 'json'),
    read: readJSON,
  });
}
