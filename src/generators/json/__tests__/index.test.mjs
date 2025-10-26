// @ts-check
import { describe, test, before } from 'node:test';
import assert from 'node:assert';
import { join } from 'node:path';
import { SemVer } from 'semver';
import { Validator } from 'jsonschema';
import createMarkdownLoader from '../../../loaders/markdown.mjs';
import createMarkdownParser from '../../../parsers/markdown.mjs';
import createGenerator from '../../../generators.mjs';
import { parseSchema } from '../utils/parseSchema.mjs';

const FIXTURES_DIR = join(import.meta.dirname, 'fixtures');

const loader = createMarkdownLoader();
const parser = createMarkdownParser();

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
      const files = await loader.loadFiles([input]);
      const docs = await parser.parseApiDocs(files);

      const { runGenerators } = createGenerator(docs);

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
