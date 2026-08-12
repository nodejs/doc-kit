import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';
import { describe, it, before, after } from 'node:test';

import { loadGenerator } from '../loader.mjs';

// A package that only exists in the fake project's node_modules — never in
// the workspace — so a bare import() from core is guaranteed to miss and
// exercise the cwd fallback used by one-shot (`npx @doc-kit/cli`) runs.
const PACKAGE_NAME = '@doc-kit-test/fake-generator';

describe('loadGenerator', () => {
  let projectDir;
  let originalCwd;

  before(async () => {
    projectDir = await mkdtemp(join(tmpdir(), 'doc-kit-loader-'));

    const packageDir = join(projectDir, 'node_modules', PACKAGE_NAME);
    await mkdir(packageDir, { recursive: true });

    await writeFile(
      join(packageDir, 'package.json'),
      JSON.stringify({
        name: PACKAGE_NAME,
        version: '1.0.0',
        exports: { './gen': './gen.mjs' },
      })
    );

    await writeFile(
      join(packageDir, 'gen.mjs'),
      'export default { name: "fake", generate: () => {} };\n'
    );

    originalCwd = process.cwd();
    process.chdir(projectDir);
  });

  after(async () => {
    process.chdir(originalCwd);
    await rm(projectDir, { recursive: true, force: true });
  });

  it('should resolve packages from the invoking project', async () => {
    const generator = await loadGenerator(`${PACKAGE_NAME}/gen`);

    assert.equal(generator.name, 'fake');
  });

  it('should throw a friendly error when a package is not installed anywhere', async () => {
    await assert.rejects(
      loadGenerator('@doc-kit-test/does-not-exist'),
      /Could not load generator "@doc-kit-test\/does-not-exist"/
    );
  });

  it('should reject modules that are not generators', async () => {
    const notAGenerator = join(projectDir, 'not-a-generator.mjs');
    await writeFile(notAGenerator, 'export default { name: "broken" };\n');

    await assert.rejects(loadGenerator(notAGenerator), /is not a generator/);
  });
});
