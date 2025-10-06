#!/usr/bin/env node

/**
 * Generates the typedefs for the JSON generator from the JSON schema
 */

import { readFile, writeFile } from 'node:fs/promises';

import { compile } from 'json-schema-to-typescript';
import { parse } from 'jsonc-parser';

const SCHEMA_PATH = import.meta.resolve('../src/generators/json/schema.jsonc');
const TYPES_PATH = import.meta.resolve('../src/generators/json/generated.d.ts');

// Read the contents of the JSON schema
const schemaString = await readFile(SCHEMA_PATH, 'utf8');

// Parse the JSON schema into an object
const schema = await parse(schemaString);

// Compile the the JSON schema into TypeScript typedefs
const typeDefs = await compile(schema, 'ApiDocSchema');

// Write the types to the expected output path
await writeFile(TYPES_PATH, typeDefs);
