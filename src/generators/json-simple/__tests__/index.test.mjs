import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';

const writeFile = mock.fn(async () => {});

mock.module('node:fs/promises', {
  namedExports: { writeFile },
});

const jsonSimple = (await import('../index.mjs')).default;

describe('generators/json-simple', () => {
  it('removes headings and stability nodes and does not mutate original', async () => {
    const original = [
      {
        api: 'fs',
        content: {
          type: 'root',
          children: [
            {
              type: 'heading',
              depth: 1,
              children: [{ type: 'text', value: 'T' }],
            },
            {
              type: 'blockquote',
              children: [
                {
                  type: 'paragraph',
                  children: [
                    { type: 'text', value: 'Stability: 1 - Experimental' },
                  ],
                },
              ],
            },
            { type: 'paragraph', children: [{ type: 'text', value: 'Body' }] },
          ],
        },
      },
    ];

    const out = await jsonSimple.generate(original, {});

    assert.equal(out.length, 1);

    // Original not mutated
    assert.equal(original[0].content.children[0].type, 'heading');

    // Mapped output has removed heading + stability
    const types = out[0].content.children.map(n => n.type);
    assert.deepEqual(types, ['paragraph']);
  });

  it('writes api-docs.json when output is provided', async () => {
    writeFile.mock.resetCalls();

    const input = [{ api: 'fs', content: { type: 'root', children: [] } }];

    await jsonSimple.generate(input, { output: '/tmp/out' });

    assert.equal(writeFile.mock.callCount(), 1);
    const [path, content] = writeFile.mock.calls[0].arguments;

    assert.ok(String(path).endsWith('/api-docs.json'));
    assert.equal(typeof content, 'string');
  });
});
