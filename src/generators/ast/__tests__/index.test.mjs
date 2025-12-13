import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import os from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import astGenerator from '../index.mjs';

describe('generators/ast', () => {
  it('processChunk reads markdown files and returns parsed trees', async () => {
    const tmp = await mkdtemp(join(os.tmpdir(), 'doc-kit-ast-'));
    const f1 = join(tmp, 'a.md');
    const f2 = join(tmp, 'b.md');

    await writeFile(f1, '## Hello\n\nStability: 1 - Experimental\n');
    await writeFile(f2, '# Title\n\nText\n');

    const out = await astGenerator.processChunk([f1, f2], [0, 1]);

    assert.equal(out.length, 2);
    assert.equal(out[0].file.basename, 'a.md');
    assert.equal(out[1].file.basename, 'b.md');
    assert.equal(out[0].tree.type, 'root');
  });

  it('generate filters non-.md files and yields worker stream chunks', async () => {
    const tmp = await mkdtemp(join(os.tmpdir(), 'doc-kit-ast-'));
    const md = join(tmp, 'only.md');
    const txt = join(tmp, 'skip.txt');

    await writeFile(md, '# A\n');
    await writeFile(txt, 'nope');

    const seen = { files: null };

    const worker = {
      async *stream(files) {
        seen.files = files;
        yield [{ file: { basename: 'only.md' }, tree: { type: 'root' } }];
      },
    };

    const gen = astGenerator.generate(undefined, {
      input: [join(tmp, '*')],
      worker,
    });

    const chunks = [];
    for await (const c of gen) {
      chunks.push(c);
    }

    assert.deepEqual(seen.files, [md]);
    assert.equal(chunks.length, 1);
  });
});
