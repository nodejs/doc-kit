import assert from 'node:assert';
import { join } from 'node:path';
import { test } from 'node:test';

import { Validator } from 'jsonschema';
import { SemVer } from 'semver';

import { BASE_URL } from '../../../constants.mjs';
import createGenerator from '../../../generators.mjs';
import createMarkdownLoader from '../../../loaders/markdown.mjs';
import createMarkdownParser from '../../../parsers/markdown.mjs';
import { SCHEMA_FILENAME } from '../constants.mjs';
import jsonAll from '../index.mjs';
import { generateJsonSchema } from '../util/generateJsonSchema.mjs';

const FIXTURES_DIR = join(
  import.meta.dirname,
  '..',
  'json',
  '__tests__',
  'fixtures'
);

const loader = createMarkdownLoader();
const parser = createMarkdownParser();

test('generator output complies with json schema', async () => {
  const validator = new Validator();

  const version = 'v1.2.3';

  /**
   * @type {object}
   */
  const schema = generateJsonSchema(version);

  const input = [
    join(FIXTURES_DIR, 'text-doc.md'),
    join(FIXTURES_DIR, 'module.md'),
  ];
  const files = await loader.loadFiles(input);
  const docs = await parser.parseApiDocs(files);

  const { runGenerators } = createGenerator(docs);

  const result = await runGenerators({
    generators: ['json-all'],
    input,
    output: undefined,
    version: new SemVer('v1.2.3'),
    releases: [],
    gitRef: 'a'.repeat(40),
    threads: 1,
    typeMap: {},
  });

  assert.ok(validator.validate(result, schema).valid);
});

test('combines json correctly', async () => {
  const version = 'v1.2.3';

  /**
   * @type {Array<import('../../json/generated/generated.d.ts').NodeJsAPIDocumentationSchema>}
   */
  const jsonOutput = [
    {
      $schema: `https://nodejs.org/docs/${version}/api/node-doc-schema.json`,
      source: 'doc/api/some-module.md',
      type: 'module',
      '@name': 'Some Module',
      '@module': 'node:module',
      classes: [],
    },
    {
      $schema: `https://nodejs.org/docs/${version}/api/node-doc-schema.json`,
      source: 'doc/api/some-module.md',
      type: 'text',
      '@name': 'Some Module',
      description: 'asdf',
      text: [
        {
          type: 'text',
          '@name': 'asdf',
          description: 'bla bla bla',
        },
      ],
    },
  ];

  const result = await jsonAll.generate(jsonOutput, {
    version: new SemVer(version),
  });

  assert.deepStrictEqual(result, {
    $schema: `${BASE_URL}docs/${version}/api/${SCHEMA_FILENAME}`,
    modules: [
      {
        type: 'module',
        '@name': 'Some Module',
        '@module': 'node:module',
        classes: [],
      },
    ],
    text: [
      {
        type: 'text',
        '@name': 'Some Module',
        description: 'asdf',
        text: [
          {
            type: 'text',
            '@name': 'asdf',
            description: 'bla bla bla',
          },
        ],
      },
    ],
  });
});
