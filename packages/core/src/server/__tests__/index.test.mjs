import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it, after } from 'node:test';

import {
  createRebuildScheduler,
  createStaticServer,
  getContentType,
  listenOnAvailablePort,
  resolveStaticPath,
} from '../index.mjs';

const root = mkdtempSync(join(tmpdir(), 'doc-kit-server-'));

writeFileSync(join(root, 'index.html'), '<h1>home</h1>');
writeFileSync(join(root, 'page.html'), '<h1>page</h1>');
writeFileSync(join(root, 'app.css'), 'body {}');
mkdirSync(join(root, 'nested'));
writeFileSync(join(root, 'nested', 'index.html'), '<h1>nested</h1>');
writeFileSync(join(tmpdir(), 'doc-kit-server-outside.txt'), 'secret');

describe('getContentType', () => {
  it('should map known extensions', () => {
    assert.equal(getContentType('page.html'), 'text/html; charset=utf-8');
    assert.equal(getContentType('a/b/style.css'), 'text/css; charset=utf-8');
  });

  it('should fall back to octet-stream for unknown extensions', () => {
    assert.equal(getContentType('archive.tar.zst'), 'application/octet-stream');
  });
});

describe('resolveStaticPath', () => {
  it('should serve the root index.html for /', () => {
    assert.equal(resolveStaticPath(root, '/'), join(root, 'index.html'));
  });

  it('should serve exact files', () => {
    assert.equal(
      resolveStaticPath(root, '/page.html'),
      join(root, 'page.html')
    );
  });

  it('should fall back to <path>.html for extension-less URLs', () => {
    assert.equal(resolveStaticPath(root, '/page'), join(root, 'page.html'));
  });

  it('should serve directory indexes', () => {
    assert.equal(
      resolveStaticPath(root, '/nested/'),
      join(root, 'nested', 'index.html')
    );
  });

  it('should ignore query strings', () => {
    assert.equal(
      resolveStaticPath(root, '/page.html?version=1'),
      join(root, 'page.html')
    );
  });

  it('should return null for missing files', () => {
    assert.equal(resolveStaticPath(root, '/missing'), null);
  });

  it('should reject path traversal', () => {
    assert.equal(
      resolveStaticPath(root, '/../doc-kit-server-outside.txt'),
      null
    );
    assert.equal(
      resolveStaticPath(root, '/%2e%2e/doc-kit-server-outside.txt'),
      null
    );
  });
});

describe('createStaticServer', () => {
  const server = createStaticServer(root);

  after(() => server.close());

  it('should serve files with their content type', async () => {
    const port = await listenOnAvailablePort(server, 0);
    const response = await fetch(`http://localhost:${port}/page`);

    assert.equal(response.status, 200);
    assert.equal(
      response.headers.get('content-type'),
      'text/html; charset=utf-8'
    );
    assert.equal(await response.text(), '<h1>page</h1>');
  });

  it('should return 404 for unknown paths', async () => {
    const { port } = server.address();
    const response = await fetch(`http://localhost:${port}/nope`);

    assert.equal(response.status, 404);
  });

  it('should reject non-GET methods', async () => {
    const { port } = server.address();
    const response = await fetch(`http://localhost:${port}/page`, {
      method: 'POST',
    });

    assert.equal(response.status, 405);
  });
});

describe('listenOnAvailablePort', () => {
  it('should fall back to the next port when the preferred one is taken', async () => {
    const blocker = createServer();
    await new Promise(resolve => blocker.listen(0, resolve));
    const { port: taken } = blocker.address();

    const server = createStaticServer(root);
    const port = await listenOnAvailablePort(server, taken);

    assert.equal(port, taken + 1);

    server.close();
    blocker.close();
  });

  it('should throw when no port in the range is available', async () => {
    const blocker = createServer();
    await new Promise(resolve => blocker.listen(0, resolve));
    const { port: taken } = blocker.address();

    const server = createStaticServer(root);

    await assert.rejects(
      listenOnAvailablePort(server, taken, 1),
      /No available port/
    );

    blocker.close();
  });
});

describe('createRebuildScheduler', () => {
  it('should coalesce bursts of events into one rebuild', async () => {
    let runs = 0;
    const schedule = createRebuildScheduler(async () => runs++, 10);

    schedule();
    schedule();
    schedule();

    await new Promise(resolve => setTimeout(resolve, 50));
    assert.equal(runs, 1);
  });

  it('should queue exactly one follow-up when events arrive mid-rebuild', async () => {
    let runs = 0;
    let release;
    const gate = new Promise(resolve => (release = resolve));

    const schedule = createRebuildScheduler(async () => {
      runs++;

      if (runs === 1) {
        await gate;
      }
    }, 5);

    schedule();
    await new Promise(resolve => setTimeout(resolve, 20));

    // The first rebuild is now in flight; these should fold into one rerun
    schedule();
    schedule();
    await new Promise(resolve => setTimeout(resolve, 20));

    release();
    await new Promise(resolve => setTimeout(resolve, 20));

    assert.equal(runs, 2);
  });
});
