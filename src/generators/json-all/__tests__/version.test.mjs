'use strict';

import test from 'node:test';
import assert from 'node:assert';
import jsonAll from '../../json-all/index.mjs';
import json from '../index.mjs';
import { generateJsonSchema } from '../util/generateJsonSchema.mjs';

test('json-all generator matches json generator version match', () => {
  assert.strictEqual(jsonAll.version, json.version);
});

test('schema version matches generator version', () => {
  const schema = generateJsonSchema();

  assert.strictEqual(schema.$id, `nodejs-api-doc-all@v${jsonAll.version}`);
});
