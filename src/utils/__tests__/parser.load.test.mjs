import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import os from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { loadFromURL } from '../parser.mjs';

describe('utils/parser.loadFromURL', () => {
  it('loads from filesystem path', async () => {
    const tmp = await mkdtemp(join(os.tmpdir(), 'doc-kit-'));
    const file = join(tmp, 'f.txt');
    await writeFile(file, 'hello');
    const content = await loadFromURL(file);
    assert.equal(content, 'hello');
  });

  it('uses fetch for network URLs', async () => {
    // stub global.fetch
    const orig = global.fetch;
    global.fetch = async () => ({ text: async () => 'net' });

    const content = await loadFromURL(new URL('https://example.test/'));
    assert.equal(content, 'net');

    global.fetch = orig;
  });
});
