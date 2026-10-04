import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { setConfig } from '#utils/configuration/index.mjs';

import { SCHEMA_VERSION } from '../../json/constants.mjs';
import { generate } from '../generate.mjs';

const config = await setConfig({ target: ['json-all'] });

const document = id => ({ id, path: `/${id}`, children: [] });

describe('json-all', () => {
  it('bundles the documents in index order, then by id', async () => {
    config['json-all'].index = [
      { section: 'HTTP', api: 'http' },
      { section: 'File system', api: 'fs' },
    ];
    config['json-all'].output = undefined;

    const bundle = await generate(
      ['zlib', 'fs', 'assert', 'http'].map(document)
    );

    assert.equal(
      bundle.$schema,
      `https://doc-kit.nodejs.org/schemas/api-doc-all/${SCHEMA_VERSION}.json`
    );
    assert.deepEqual(
      bundle.documents.map(({ id }) => id),
      ['http', 'fs', 'assert', 'zlib']
    );
  });
});
