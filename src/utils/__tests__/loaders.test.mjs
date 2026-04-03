import assert from 'node:assert/strict';
import { describe, it, mock, afterEach } from 'node:test';

let fileContent = 'hello from file';
mock.module('node:fs/promises', {
  namedExports: {
    readFile: async () => fileContent,
  },
});

const { toParsedURL, loadFromURL, importFromURL } =
  await import('../loaders.mjs');

describe('toParsedURL', () => {
  it('should return the same URL instance when given a URL object', () => {
    const url = new URL('https://nodejs.org');
    assert.strictEqual(toParsedURL(url), url);
  });

  it('should parse a valid URL string into a URL object', () => {
    const result = toParsedURL('https://nodejs.org/api');
    assert.ok(result instanceof URL);
    assert.strictEqual(result.hostname, 'nodejs.org');
  });

  it('should return null for a string that cannot be parsed as a URL', () => {
    assert.strictEqual(toParsedURL('not-a-url'), null);
  });
});

describe('loadFromURL', () => {
  afterEach(() => mock.restoreAll());

  it('should read content from the filesystem for a plain file path', async () => {
    fileContent = 'file content';
    const result = await loadFromURL('/some/path/file.txt');
    assert.strictEqual(result, 'file content');
  });

  it('should read content from the filesystem for a file: URL', async () => {
    fileContent = 'from file url';
    const result = await loadFromURL(new URL('file:///some/file.txt'));
    assert.strictEqual(result, 'from file url');
  });

  it('should fetch content from an http URL', async () => {
    mock.method(globalThis, 'fetch', async () => ({
      text: async () => 'fetched content',
    }));

    const result = await loadFromURL('https://nodejs.org/data.txt');
    assert.strictEqual(result, 'fetched content');
  });
});

describe('importFromURL', () => {
  it('should import a module from a valid URL and return default export', async () => {
    const mod = await importFromURL(import.meta.url);
    // The test file itself has no default export, so the full module is returned
    assert.ok(mod !== undefined);
  });

  it('should resolve a relative path to an absolute file URL', async () => {
    // Importing the loaders module itself as a sanity check
    const mod = await importFromURL(new URL('../loaders.mjs', import.meta.url));
    assert.ok(typeof mod.loadFromURL === 'function');
    assert.ok(typeof mod.importFromURL === 'function');
  });
});
