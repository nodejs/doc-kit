import { basename, join, relative, sep } from 'node:path';
import { after, before, describe, it } from 'node:test';

import { globSync } from 'tinyglobby';

import createWorkerPool from '../../../threading/index.mjs';
import createParallelWorker from '../../../threading/parallel.mjs';
import { setConfig } from '../../../utils/configuration/index.mjs';
import astJs from '../../ast-js/index.mjs';
import apiLinks from '../index.mjs';

const relativePath = relative(process.cwd(), import.meta.dirname);

const sourceFiles = globSync('*.js', {
  cwd: new URL(import.meta.resolve('./fixtures')),
});

const config = await setConfig({});

describe('api links', () => {
  let pool;

  before(() => {
    pool = createWorkerPool(config.threads);
  });

  after(async () => {
    await pool.destroy();
  });

  describe('should work correctly for all fixtures', () => {
    sourceFiles.forEach(sourceFile => {
      it(`${basename(sourceFile)}`, async t => {
        config['ast-js'].input = [
          join(relativePath, 'fixtures', sourceFile).replaceAll(sep, '/'),
        ];

        const worker = createParallelWorker('ast-js', pool, config);

        // Collect results from the async generator
        const astJsResults = [];

        for await (const chunk of astJs.generate(undefined, worker)) {
          astJsResults.push(...chunk);
        }

        const actualOutput = await apiLinks.generate(astJsResults);

        for (const [k, v] of Object.entries(actualOutput)) {
          actualOutput[k] = v.replace(/.*(?=lib\/)/, '');
        }

        t.assert.snapshot(actualOutput);
      });
    });
  });
});
