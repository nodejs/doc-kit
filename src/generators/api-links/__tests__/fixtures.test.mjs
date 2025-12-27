import { readdir } from 'node:fs/promises';
import { cpus } from 'node:os';
import { basename, extname, join } from 'node:path';
import { after, before, describe, it } from 'node:test';

import createWorkerPool from '../../../threading/index.mjs';
import createParallelWorker from '../../../threading/parallel.mjs';
import astJs from '../../ast-js/index.mjs';
import apiLinks from '../index.mjs';

const FIXTURES_DIRECTORY = join(import.meta.dirname, 'fixtures');
const fixtures = await readdir(FIXTURES_DIRECTORY);

const sourceFiles = fixtures
  .filter(fixture => extname(fixture) === '.js')
  .map(fixture => join(FIXTURES_DIRECTORY, fixture));

describe('api links', () => {
  const threads = cpus().length;
  let pool;

  before(() => {
    pool = createWorkerPool(threads);
  });

  after(async () => {
    await pool.destroy();
  });

  describe('should work correctly for all fixtures', () => {
    sourceFiles.forEach(sourceFile => {
      it(`${basename(sourceFile)}`, async t => {
        const worker = createParallelWorker('ast-js', pool, {
          threads,
          chunkSize: 10,
        });

        // Collect results from the async generator
        const astJsResults = [];

        for await (const chunk of astJs.generate(undefined, {
          input: [sourceFile.replaceAll('\\', '/')],
          worker,
        })) {
          astJsResults.push(...chunk);
        }

        const actualOutput = await apiLinks.generate(astJsResults, {
          gitRef: 'https://github.com/nodejs/node/tree/HEAD',
        });

        for (const [k, v] of Object.entries(actualOutput)) {
          actualOutput[k] = v.replace(/.*(?=lib\/)/, '');
        }

        t.assert.snapshot(actualOutput);
      });
    });
  });
});
