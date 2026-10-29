import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { setConfig } from '#utils/configuration/index.mjs';

import { generate } from '../generate.mjs';

const config = await setConfig({ target: ['json-simple'] });
config['json-simple'].output = undefined;

describe('json-simple generate', () => {
  it('does not mutate input while removing headings and stability nodes', async () => {
    const heading = {
      type: 'heading',
      depth: 1,
      children: [{ type: 'text', value: 'fs' }],
    };
    const stability = {
      type: 'blockquote',
      children: [
        {
          type: 'paragraph',
          children: [{ type: 'text', value: 'Stability: 2 - Stable' }],
        },
      ],
    };
    const paragraph = {
      type: 'paragraph',
      children: [{ type: 'text', value: 'The fs module.' }],
    };
    const input = [
      {
        heading,
        content: { type: 'root', children: [heading, stability, paragraph] },
      },
    ];
    const snapshot = structuredClone(input);

    const output = await generate(input);

    assert.deepEqual(input, snapshot);
    assert.deepEqual(output[0].content.children, [paragraph]);
    assert.notEqual(output[0].content, input[0].content);
  });
});
