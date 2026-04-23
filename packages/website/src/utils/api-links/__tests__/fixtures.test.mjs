import { basename, join, relative, sep } from 'node:path';
import { after, before, describe, it } from 'node:test';

import { loadGenerator } from '#core/loader.mjs';
import createWorkerPool from '#core/threading/index.mjs';
import createParallelWorker from '#core/threading/parallel.mjs';
import { setConfig } from '#core/utils/configuration/index.mjs';
import { generate as astJsGenerate } from '@doc-kittens/internal/ast-js';
import { globSync } from 'tinyglobby';

import { generate as apiLinksGenerate } from '../../../generators/api-links/index.mjs';

const relativePath = relative(process.cwd(), import.meta.dirname);

const sourceFiles = globSync('*.js', {
  cwd: new URL(import.meta.resolve('./fixtures')),
});

const astJsSpecifier = '@doc-kittens/internal/ast-js';
const astJsGenerator = await loadGenerator(astJsSpecifier);
const apiLinksSpecifier = '@doc-kittens/website/api-links';
const apiLinksGenerator = await loadGenerator(apiLinksSpecifier);

const loadedGenerators = new Map([
  [astJsSpecifier, astJsGenerator],
  [apiLinksSpecifier, apiLinksGenerator],
]);

const config = await setConfig({}, loadedGenerators);

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

        const worker = await createParallelWorker(
          astJsSpecifier,
          astJsGenerator,
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
