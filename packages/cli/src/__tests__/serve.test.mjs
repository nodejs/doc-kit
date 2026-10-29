import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, describe, it } from 'node:test';

import { serve } from '../serve.mjs';

describe('serve', () => {
  let root;
  let server;
  let base;

  before(async () => {
    root = await mkdtemp(join(tmpdir(), 'doc-kit-serve-'));

    await mkdir(join(root, 'assets'), { recursive: true });
    await mkdir(join(root, 'empty'), { recursive: true });
    await writeFile(join(root, 'index.html'), '<h1>Home</h1>');
    await writeFile(join(root, '404.html'), '<h1>Lost</h1>');
    await writeFile(join(root, 'assets', 'style.css'), 'body {}');

    server = await serve(root, { port: 0 });
    base = `http://localhost:${server.address().port}`;
  });

  after(async () => {
    server.close();
    await rm(root, { recursive: true, force: true });
  });

  it('serves index.html for the root path', async () => {
    const response = await fetch(`${base}/`);

    assert.equal(response.status, 200);
    assert.equal(
      response.headers.get('content-type'),
      'text/html; charset=utf-8'
    );
    assert.equal(await response.text(), '<h1>Home</h1>');
  });

  it('serves files with their MIME type', async () => {
    const response = await fetch(`${base}/assets/style.css`);

    assert.equal(response.status, 200);
    assert.equal(
      response.headers.get('content-type'),
      'text/css; charset=utf-8'
    );
    assert.equal(await response.text(), 'body {}');
  });

  it('falls back to 404.html for missing paths', async () => {
    const response = await fetch(`${base}/missing`);

    assert.equal(response.status, 404);
    assert.equal(await response.text(), '<h1>Lost</h1>');
  });

  it('falls back to 404.html for directories without index.html', async () => {
    const response = await fetch(`${base}/empty`);

    assert.equal(response.status, 404);
    assert.equal(await response.text(), '<h1>Lost</h1>');
  });

  it('rejects path traversal outside the served directory', async () => {
    // The URL parser normalizes dot segments, but encoded slashes are kept;
    // decoding them turns the path into one that escapes the root
    const response = await fetch(`${base}/a%2F..%2F..%2Fsecret.txt`);

    assert.equal(response.status, 403);
  });
});
