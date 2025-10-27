'use strict';

import assert from 'node:assert';
import test from 'node:test';

import json from '../../json/index.mjs';
import jsonAll from '../index.mjs';
import { generateJsonSchema } from '../util/generateJsonSchema.mjs';

test('json-all generator matches json generator version match', () => {
  assert.strictEqual(jsonAll.version, json.version);
});

test('schema version matches generator version', () => {
  const schema = generateJsonSchema();

  assert.strictEqual(schema.$id, `nodejs-api-doc-all@v${jsonAll.version}`);
});
