#!/usr/bin/env node

// Regenerates the TypeScript types of the `json` generator's output from its
// JSON schema. Run it after editing `schema.json`; a test fails while the
// committed types are stale.

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { compile } from 'json-schema-to-typescript';

const GENERATOR = new URL(
  '../packages/core/src/generators/json/',
  import.meta.url
);

export const SCHEMA_PATH = new URL('schema.json', GENERATOR);
export const TYPES_PATH = new URL('generated/schema.d.ts', GENERATOR);

const PRETTIER_CONFIG = new URL('../.prettierrc.json', import.meta.url);

/**
 * Compiles the schema into the TypeScript source of its types.
 *
 * @returns {Promise<string>}
 */
export const compileSchemaTypes = async () => {
  const schema = JSON.parse(await readFile(SCHEMA_PATH, 'utf-8'));

  // The repository's formatting, minus the per-path overrides
  const style = JSON.parse(await readFile(PRETTIER_CONFIG, 'utf-8'));
  delete style.overrides;

  return compile(schema, 'Document', {
    bannerComment:
      '/* eslint-disable */\n' +
      '/**\n' +
      ' * Generated from `schema.json` by `scripts/generate-json-types.mjs`.\n' +
      ' * Do not edit: change the schema and regenerate instead.\n' +
      ' */',
    // The schema lists every property; consumers get no index signatures
    additionalProperties: false,
    style,
  });
};

if (import.meta.main) {
  await writeFile(TYPES_PATH, await compileSchemaTypes());

  console.log(`Wrote ${fileURLToPath(TYPES_PATH)}`);
}
