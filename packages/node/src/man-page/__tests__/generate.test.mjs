import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { setConfig } from '@doc-kit/core/utils/configuration/index.mjs';
import { u } from 'unist-builder';

import { generate } from '../generate.mjs';

const config = await setConfig({ target: ['man-page'] });
config['man-page'].output = undefined;

const entry = (depth, slug, text, description = '') => {
  const heading = u('heading', { depth }, [u('text', text)]);

  return {
    heading: { depth, data: { slug, text } },
    content: u('root', [heading, u('paragraph', [u('text', description)])]),
  };
};

describe('man-page generate', () => {
  it('keeps the last environment variable when the section ends the input', async () => {
    const input = [
      entry(1, 'command-line-api', 'Command-line API'),
      entry(2, 'environment-variables', 'Environment variables', 'Intro.'),
      entry(2, 'options', 'Options'),
      entry(3, '--foo', '`--foo`', 'Foo option.'),
      entry(2, 'environment-variables-1', 'Environment variables'),
      entry(3, 'node_onevalue', '`NODE_ONE=value`', 'First var.'),
      entry(3, 'node_twovalue', '`NODE_TWO=value`', 'Second var.'),
      entry(3, 'node_threevalue', '`NODE_THREE=value`', 'Third var.'),
    ];

    const output = await generate(input);

    assert.match(output, /\.It Ev NODE_ONE Ar value\nFirst var\./);
    assert.match(output, /\.It Ev NODE_TWO Ar value\nSecond var\./);
    assert.match(output, /\.It Ev NODE_THREE Ar value\nThird var\./);
  });

  it('stops the environment variables at the next section', async () => {
    const input = [
      entry(2, 'options', 'Options'),
      entry(3, '--foo', '`--foo`', 'Foo option.'),
      entry(2, 'environment-variables-1', 'Environment variables'),
      entry(3, 'node_onevalue', '`NODE_ONE=value`', 'First var.'),
      entry(2, 'useful-v8-options', 'Useful V8 options'),
      entry(3, '--max-old-space-size', '`--max-old-space-size=SIZE`', 'Heap.'),
    ];

    const output = await generate(input);

    assert.match(output, /\.It Ev NODE_ONE Ar value\nFirst var\./);
    assert.doesNotMatch(output, /max-old-space-size/);
  });
});
