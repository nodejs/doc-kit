'use strict';

import { join } from 'node:path';

import getConfig from '#utils/configuration/index.mjs';
import { writeJSON } from '#utils/file.mjs';

import { resolveSchemaURL } from '../json/utils/schema.mjs';

/**
 * Bundles the `json` generator's documents into one `all.json` file.
 *
 * @type {import('./types').Generator['generate']}
 */
export async function generate(input) {
  const config = getConfig('json-all');

  // Documents follow the configured index; the rest go after it, by id
  const order = new Map(config.index?.map(({ api }, i) => [api, i]));

  const documents = input.toSorted(
    (a, b) =>
      (order.get(a.id) ?? Infinity) - (order.get(b.id) ?? Infinity) ||
      a.id.localeCompare(b.id)
  );

  /** @type {import('./types').Bundle} */
  const bundle = { $schema: resolveSchemaURL(config), documents };

  if (config.output) {
    await writeJSON(join(config.output, 'all.json'), bundle, config.minify);
  }

  return bundle;
}
