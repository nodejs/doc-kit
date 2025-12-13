import { strictEqual, rejects, ok } from 'node:assert';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import generator from '../index.mjs';

describe('orama-db generate', () => {
  it('throws when input is missing or empty', async () => {
    await rejects(async () =>
      generator.generate(undefined, { output: './tmp' })
    );
    await rejects(async () => generator.generate([], { output: './tmp' }));
  });

  it('throws when output path is missing', async () => {
    const fakeInput = [
      {
        api: 'a',
        slug: 's',
        heading: { data: { name: 'A' }, depth: 1 },
        content: { children: [] },
      },
    ];
    await rejects(async () =>
      generator.generate(fakeInput, { output: undefined })
    );
  });

  it('writes an orama-db.json file with expected documents', async () => {
    // prepare temporary output directory
    const dir = await mkdtemp(join(tmpdir(), 'orama-'));

    try {
      const input = [
        // Two entries in same module to test grouping and hierarchical titles
        {
          api: 'mymod',
          slug: 'one',
          heading: { data: { name: 'Module' }, depth: 1 },
          content: {
            children: [
              {
                type: 'paragraph',
                children: [{ type: 'text', value: 'First description' }],
              },
            ],
          },
        },
        {
          api: 'mymod',
          slug: 'two',
          heading: { data: { name: 'Child' }, depth: 2 },
          content: {
            children: [
              {
                type: 'paragraph',
                children: [{ type: 'text', value: 'Second description' }],
              },
            ],
          },
        },
      ];

      await generator.generate(input, { output: dir });

      const file = await readFile(join(dir, 'orama-db.json'), 'utf8');
      const parsed = JSON.parse(file);

      // Basic sanity checks on saved DB structure
      ok(parsed, 'saved DB should be JSON');
      // Expect some representation of documents to exist
      // The exact schema is internal to orama; ensure serialized contains our slugs/titles
      const serialized = JSON.stringify(parsed);
      strictEqual(serialized.includes('mymod.html#one'), true);
      strictEqual(serialized.includes('mymod.html#two'), true);
      strictEqual(serialized.includes('Module'), true);
      strictEqual(serialized.includes('Child'), true);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
