import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { describe, it } from 'node:test';

import Ajv from 'ajv';

import {
  compileSchemaTypes,
  TYPES_PATH,
} from '../../../../../../scripts/generate-json-types.mjs';
import bundleSchema from '../../json-all/schema.json' with { type: 'json' };
import { SCHEMA_VERSION } from '../constants.mjs';
import schema from '../schema.json' with { type: 'json' };

describe('schema', () => {
  it('compiles in strict mode, and the bundle schema resolves it', () => {
    const ajv = new Ajv({ strict: true });

    ajv.addSchema(schema);

    assert.ok(ajv.compile(bundleSchema));
  });

  it('is versioned like the generator', () => {
    assert.ok(schema.$id.endsWith(`/${SCHEMA_VERSION}.json`));
    assert.ok(bundleSchema.$id.endsWith(`/${SCHEMA_VERSION}.json`));
    assert.equal(bundleSchema.properties.documents.items.$ref, schema.$id);
  });

  it('has its generated types committed', async () => {
    assert.equal(
      await readFile(TYPES_PATH, 'utf-8'),
      await compileSchemaTypes()
    );
  });
});
