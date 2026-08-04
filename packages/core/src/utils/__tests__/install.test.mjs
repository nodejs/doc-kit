import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import {
  buildInstallArguments,
  detectPackageManager,
  isDevInstall,
  isPathTarget,
  packageForSpecifier,
  resolveGeneratorPackages,
} from '../install.mjs';

describe('packageForSpecifier', () => {
  it('should extract scoped package names', () => {
    assert.equal(
      packageForSpecifier('@nodejs/doc-kit-generator-react/html'),
      '@nodejs/doc-kit-generator-react'
    );
  });

  it('should extract unscoped package names', () => {
    assert.equal(packageForSpecifier('some-package/generator'), 'some-package');
  });
});

describe('isPathTarget', () => {
  it('should detect relative and absolute paths and file URLs', () => {
    assert.equal(isPathTarget('./my-generator.mjs'), true);
    assert.equal(isPathTarget('/abs/generator.mjs'), true);
    assert.equal(isPathTarget('file:///abs/generator.mjs'), true);
    assert.equal(isPathTarget('@scope/package/sub'), false);
    assert.equal(isPathTarget('package'), false);
  });
});

describe('resolveGeneratorPackages', () => {
  it('should resolve built-in generators to their package, deduplicated', () => {
    assert.deepEqual(resolveGeneratorPackages(['html', 'orama-db']), [
      '@nodejs/doc-kit-generator-react',
    ]);
  });

  it('should resolve deprecated aliases', () => {
    assert.deepEqual(resolveGeneratorPackages(['web']), [
      '@nodejs/doc-kit-generator-react',
    ]);
  });

  it('should resolve generators from this package to no install', () => {
    assert.deepEqual(resolveGeneratorPackages(['json-simple']), []);
  });

  it('should reject unknown names', () => {
    assert.throws(
      () => resolveGeneratorPackages(['legacy-htlm']),
      /not a built-in generator/
    );
  });

  it('should resolve third-party specifiers when allowed', () => {
    assert.deepEqual(
      resolveGeneratorPackages(['@scope/custom/generator'], true),
      ['@scope/custom']
    );
  });

  it('should skip filesystem targets when specifiers are allowed', () => {
    assert.deepEqual(resolveGeneratorPackages(['./local.mjs'], true), []);
  });
});

describe('detectPackageManager', () => {
  it('should detect the package manager from the lockfile', () => {
    const dir = mkdtempSync(join(tmpdir(), 'doc-kit-install-'));

    assert.equal(detectPackageManager(dir), 'npm');

    writeFileSync(join(dir, 'yarn.lock'), '');
    assert.equal(detectPackageManager(dir), 'yarn');

    writeFileSync(join(dir, 'pnpm-lock.yaml'), '');
    assert.equal(detectPackageManager(dir), 'pnpm');
  });
});

describe('isDevInstall', () => {
  it('should default to dev without a manifest', () => {
    const dir = mkdtempSync(join(tmpdir(), 'doc-kit-install-'));

    assert.equal(isDevInstall(dir), true);
  });

  it('should mirror a production install of this package', () => {
    const dir = mkdtempSync(join(tmpdir(), 'doc-kit-install-'));

    writeFileSync(
      join(dir, 'package.json'),
      JSON.stringify({ dependencies: { '@nodejs/doc-kit': '^1.0.0' } })
    );

    assert.equal(isDevInstall(dir), false);
  });

  it('should mirror a dev install of this package', () => {
    const dir = mkdtempSync(join(tmpdir(), 'doc-kit-install-'));

    writeFileSync(
      join(dir, 'package.json'),
      JSON.stringify({ devDependencies: { '@nodejs/doc-kit': '^1.0.0' } })
    );

    assert.equal(isDevInstall(dir), true);
  });
});

describe('buildInstallArguments', () => {
  it('should build npm arguments', () => {
    assert.deepEqual(buildInstallArguments('npm', ['a', 'b'], true), [
      'install',
      '--save-dev',
      'a',
      'b',
    ]);
    assert.deepEqual(buildInstallArguments('npm', ['a'], false), [
      'install',
      'a',
    ]);
  });

  it('should build yarn, pnpm, and bun arguments', () => {
    assert.deepEqual(buildInstallArguments('yarn', ['a'], true), [
      'add',
      '--dev',
      'a',
    ]);
    assert.deepEqual(buildInstallArguments('pnpm', ['a'], true), [
      'add',
      '--save-dev',
      'a',
    ]);
    assert.deepEqual(buildInstallArguments('bun', ['a'], true), [
      'add',
      '--dev',
      'a',
    ]);
  });
});
