import { readdir } from 'node:fs/promises';
import { basename, extname, join } from 'node:path';
import { describe, it } from 'node:test';

import astJs from '../../ast-js/index.mjs';
import apiLinks from '../index.mjs';

const FIXTURES_DIRECTORY = join(import.meta.dirname, 'fixtures');
const fixtures = await readdir(FIXTURES_DIRECTORY);

const sourceFiles = fixtures
  .filter(fixture => extname(fixture) === '.js')
  .map(fixture => join(FIXTURES_DIRECTORY, fixture));

describe('api links', () => {
  describe('should work correctly for all fixtures', () => {
    for (const sourceFile of sourceFiles) {
      it(`${basename(sourceFile)}`, async t => {
        const astJsResult = await astJs.generate(undefined, {
          input: [sourceFile],
        });

        const actualOutput = await apiLinks.generate(astJsResult, {
          gitRef: 'https://github.com/nodejs/node/tree/HEAD',
        });

        for (const [k, v] of Object.entries(actualOutput)) {
          actualOutput[k] = v.replace(/.*(?=lib\/)/, '');
        }

        t.assert.snapshot(actualOutput);
      });
    }
  });
});
