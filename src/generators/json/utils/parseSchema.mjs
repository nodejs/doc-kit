'use strict';

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { parse as jsoncParse } from 'jsonc-parser';

/**
 * @returns {Promise<object>}
 */
export async function parseSchema() {
  // Read the contents of the JSON schema
  const schemaString = await readFile(
    join(import.meta.dirname, '..', 'schema.jsonc'),
    'utf8'
  );

  // Parse the JSON schema into an object
  const schema = await jsoncParse(schemaString);

  return schema;
}
