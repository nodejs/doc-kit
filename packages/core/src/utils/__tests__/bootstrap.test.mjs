import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import {
  addIgnoredOutput,
  buildConfigSource,
  detectDocsDirectory,
  findExistingConfig,
  hasMarkdown,
} from '../bootstrap.mjs';

const scratch = () => mkdtempSync(join(tmpdir(), 'doc-kit-bootstrap-'));

describe('hasMarkdown', () => {
  it('should find Markdown at any depth', () => {
    const dir = scratch();
    mkdirSync(join(dir, 'nested'));
    writeFileSync(join(dir, 'nested', 'page.md'), '# hi');

    assert.equal(hasMarkdown(dir), true);
  });

  it('should be false for empty or missing directories', () => {
    assert.equal(hasMarkdown(scratch()), false);
    assert.equal(hasMarkdown(join(scratch(), 'missing')), false);
  });
});

describe('detectDocsDirectory', () => {
  it('should prefer a conventional directory that holds Markdown', () => {
    const dir = scratch();
    mkdirSync(join(dir, 'docs'));
    mkdirSync(join(dir, 'doc'));
    writeFileSync(join(dir, 'doc', 'api.md'), '# api');

    assert.equal(detectDocsDirectory(dir), 'doc');
  });

  it('should fall back to an existing conventional directory', () => {
    const dir = scratch();
    mkdirSync(join(dir, 'documentation'));

    assert.equal(detectDocsDirectory(dir), 'documentation');
  });

  it('should default to docs for a fresh project', () => {
    assert.equal(detectDocsDirectory(scratch()), 'docs');
  });
});

describe('findExistingConfig', () => {
  it('should detect an existing configuration file', () => {
    const dir = scratch();
    writeFileSync(join(dir, 'doc-kit.config.mjs'), 'export default {};');

    assert.equal(findExistingConfig(dir), 'doc-kit.config.mjs');
    assert.equal(findExistingConfig(scratch()), undefined);
  });
});

describe('buildConfigSource', () => {
  it('should wire naming and versioning to package.json', () => {
    const source = buildConfigSource({
      targets: ['html', 'orama-db'],
      docsDir: 'docs',
      output: 'out',
      hasHomepage: true,
    });

    assert.match(source, /import packageJson from '.\/package.json'/);
    assert.match(source, /target: \["html","orama-db"\]/);
    assert.match(source, /project: packageJson.name/);
    assert.match(source, /version: packageJson.version/);
    assert.match(source, /input: \["docs\/\*\*\/\*.md"\]/);
    assert.match(source, /baseURL: packageJson.homepage/);
  });

  it('should leave baseURL as a commented hint without a homepage', () => {
    const source = buildConfigSource({
      targets: ['html'],
      docsDir: 'docs',
      output: 'out',
      hasHomepage: false,
    });

    assert.match(source, /\/\/ baseURL: /);
    assert.doesNotMatch(source, /baseURL: packageJson.homepage/);
  });

  it('should only emit the html block when html is targeted', () => {
    const source = buildConfigSource({
      targets: ['llms-txt'],
      docsDir: 'docs',
      output: 'out',
      hasHomepage: false,
    });

    assert.doesNotMatch(source, /html: \{/);
    assert.doesNotMatch(source, /project:/);
  });
});

describe('addIgnoredOutput', () => {
  it('should append to existing contents', () => {
    assert.equal(
      addIgnoredOutput('node_modules/\n', 'out'),
      'node_modules/\n\n# doc-kit output\nout/\n'
    );
  });

  it('should create contents when there is no .gitignore', () => {
    assert.equal(
      addIgnoredOutput(undefined, 'out'),
      '# doc-kit output\nout/\n'
    );
  });

  it('should leave an already-ignored output alone', () => {
    assert.equal(addIgnoredOutput('out/\n', 'out'), undefined);
    assert.equal(addIgnoredOutput('out\n', 'out'), undefined);
  });
});
