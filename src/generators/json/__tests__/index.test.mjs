import assert from 'node:assert';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, test, before } from 'node:test';

import { parse as jsoncParse } from 'jsonc-parser';
import { Validator } from 'jsonschema';
import { SemVer } from 'semver';

import createGenerator from '../../../generators.mjs';
import json from '../index.mjs';
import { parseSchema } from '../utils/parseSchema.mjs';

const FIXTURES_DIR = join(import.meta.dirname, 'fixtures');

describe('generator output complies with json schema', () => {
  const validator = new Validator();

  /**
   * @type {object}
   */
  let schema;

  before(async () => {
    schema = await parseSchema();
  });

  for (const fixture of ['text-doc', 'module']) {
    const input = join(FIXTURES_DIR, `${fixture}.md`);

    test(`${fixture}.md`, async () => {
      const { runGenerators } = createGenerator();

      const result = await runGenerators({
        generators: ['json'],
        input,
        output: undefined,
        version: new SemVer('v1.2.3'),
        releases: [],
        gitRef: 'a'.repeat(40),
        threads: 1,
        typeMap: {},
      });

      assert.ok(validator.validate(result[0], schema).valid);
    });
  }
});

test('schema version matches generator version', async () => {
  const schemaString = await readFile(
    join(import.meta.dirname, '..', 'schema.jsonc'),
    'utf8'
  );
  const schema = await jsoncParse(schemaString);

  assert.strictEqual(schema.$id, `nodejs-api-doc@v${json.version}`);
});
