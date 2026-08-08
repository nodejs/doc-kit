import { basename, join, relative, sep } from 'node:path';
import { after, before, describe, it } from 'node:test';

import { generate as astJsGenerate } from '@doc-kit/core/generators/ast-js/generate.mjs';
import { loadGenerator } from '@doc-kit/core/generators/loader.mjs';
import createWorkerPool from '@doc-kit/core/threading/index.mjs';
import createParallelWorker from '@doc-kit/core/threading/parallel.mjs';
import { setConfig } from '@doc-kit/core/utils/configuration/index.mjs';
import { globSync } from 'tinyglobby';

import { generate as apiLinksGenerate } from '../generate.mjs';

const relativePath = relative(process.cwd(), import.meta.dirname);

const sourceFiles = globSync('*.js', {
  cwd: new URL(import.meta.resolve('./fixtures')),
});

const config = await setConfig({ target: ['api-links'] });

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

        const worker = createParallelWorker(
          'ast-js',
          await loadGenerator('ast-js'),
          pool,
          config
        );

        // Collect results from the async generator
        const astJsResults = [];

        for await (const chunk of astJsGenerate(undefined, worker)) {
          astJsResults.push(...chunk);
        }

        const actualOutput = await apiLinksGenerate(astJsResults);

        for (const [k, v] of Object.entries(actualOutput)) {
          actualOutput[k] = v.replace(/.*(?=lib\/)/, '');
        }

        t.assert.snapshot(actualOutput);
      });
    });
  });
});
