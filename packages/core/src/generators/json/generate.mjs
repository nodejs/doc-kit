'use strict';

import { join } from 'node:path';

import getConfig from '#utils/configuration/index.mjs';
import { GITHUB_BLOB_URL, populate } from '#utils/configuration/templates.mjs';
import { withExt, writeJSON } from '#utils/file.mjs';
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
 * Generates one JSON document per input file.
 *
 * @type {import('./types').Generator['generate']}
 */
export async function* generate(input, worker) {
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

  for await (const chunk of worker.stream(modules, dependencies)) {
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
