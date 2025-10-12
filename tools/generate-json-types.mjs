#!/usr/bin/env node

/**
 * Generates the typedefs for the JSON generator from the JSON schema
 *
 * To use, just run this.
 */

import { join } from 'node:path';
import { readFile, writeFile } from 'node:fs/promises';
import { parse } from 'jsonc-parser';
import { compile } from 'json-schema-to-typescript';

const JSON_GENERATOR_PATH = join(
  import.meta.dirname,
  '..',
  'src',
  'generators',
  'json'
);
const SCHEMA_PATH = join(JSON_GENERATOR_PATH, 'schema.jsonc');
const TYPES_PATH = join(JSON_GENERATOR_PATH, 'generated.d.ts');

// Read the contents of the JSON schema
const schemaString = await readFile(SCHEMA_PATH, 'utf8');

// Parse the JSON schema into an object
const schema = await parse(schemaString);

// Compile the the JSON schema into TypeScript typedefs
const typeDefs = await compile(schema, 'ApiDocSchema');

// Write the types to the expected output path
await writeFile(TYPES_PATH, typeDefs);
