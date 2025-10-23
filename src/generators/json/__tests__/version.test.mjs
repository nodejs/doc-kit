'use strict';

import test from 'node:test';
import assert from 'node:assert';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parse as jsoncParse } from 'jsonc-parser';
import json from '../index.mjs';

test('schema version matches generator version', async () => {
  const schemaString = await readFile(
    join(import.meta.dirname, '..', 'schema.jsonc'),
    'utf8'
  );
  const schema = await jsoncParse(schemaString);

  assert.strictEqual(schema.$id, `nodejs-api-doc@v${json.version}`);
});
