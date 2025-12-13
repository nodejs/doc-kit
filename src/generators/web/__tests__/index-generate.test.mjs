import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import os from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import webGen from '../index.mjs';

describe('generators/web - index generate', () => {
  it('writes files when output is provided', async () => {
    const tmp = await mkdtemp(join(os.tmpdir(), 'doc-kit-test-'));

    const results = [{ html: Buffer.from('<div>ok</div>'), api: 'api' }];
    const css = 'body{}';
    const chunks = [{ fileName: 'chunk.js', code: 'console.log(1)' }];

    const stubProcess = async () => ({ results, css, chunks });

    const out = await webGen.generate([], {
      output: tmp,
      version: { version: '1.2.3' },
      overrides: { processJSXEntries: stubProcess },
    });

    // returns results as strings + css
    assert.equal(out.length, 1);
    const htmlPath = join(tmp, 'api.html');
    const written = await readFile(htmlPath, 'utf-8');
    assert.ok(written.includes('<div>ok</div>'));

    const chunkPath = join(tmp, 'chunk.js');
    const chunkContent = await readFile(chunkPath, 'utf-8');
    assert.equal(chunkContent, 'console.log(1)');

    const cssPath = join(tmp, 'styles.css');
    const cssContent = await readFile(cssPath, 'utf-8');
    assert.equal(cssContent, css);
  });
});
