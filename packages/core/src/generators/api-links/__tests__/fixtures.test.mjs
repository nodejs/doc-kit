import { basename, join, relative, sep } from 'node:path';
import { after, before, describe, it } from 'node:test';

import { globSync } from 'tinyglobby';

import { loadGenerator } from '../../../loader.mjs';
import createWorkerPool from '../../../threading/index.mjs';
import createParallelWorker from '../../../threading/parallel.mjs';
import { setConfig } from '../../../utils/configuration/index.mjs';
import { generate as astJsGenerate } from '../../ast-js/index.mjs';
import { generate as apiLinksGenerate } from '../index.mjs';

const relativePath = relative(process.cwd(), import.meta.dirname);

const sourceFiles = globSync('*.js', {
  cwd: new URL(import.meta.resolve('./fixtures')),
});

const astJsSpecifier = '@node-core/doc-kit/generators/ast-js';
const astJsGenerator = await loadGenerator(astJsSpecifier);
const apiLinksSpecifier = '@node-core/doc-kit/generators/api-links';
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
