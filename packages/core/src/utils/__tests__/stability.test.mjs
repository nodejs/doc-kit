import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { u } from 'unist-builder';

import { removeStabilityPrefix } from '../stability.mjs';

const stability = (...children) =>
  u('blockquote', { data: { index: '1.1', description: '' } }, children);

describe('removeStabilityPrefix', () => {
  it('drops a linked prefix and its separator', () => {
    const node = stability(
      u('paragraph', [
        u('link', { url: '#stability-index' }, [u('text', 'Stability: 1.1')]),
        u('text', ' - Active development. Use '),
        u('inlineCode', 'other()'),
        u('text', ' instead.'),
      ])
    );

    assert.deepEqual(removeStabilityPrefix(node).children[0].children, [
      u('text', 'Active development. Use '),
      u('inlineCode', 'other()'),
      u('text', ' instead.'),
    ]);
  });

  it('drops a plain prefix and keeps later paragraphs', () => {
    const node = stability(
      u('paragraph', [u('text', 'Stability: 2 - Stable')]),
      u('paragraph', [u('text', 'More.')])
    );

    const { children } = removeStabilityPrefix(node);

    assert.deepEqual(children[0].children, [u('text', 'Stable')]);
    assert.deepEqual(children[1].children, [u('text', 'More.')]);
  });

  it('leaves the source untouched', () => {
    const node = stability(
      u('paragraph', [u('text', 'Stability: 2 - Stable')])
    );
    const before = structuredClone(node);

    removeStabilityPrefix(node);

    assert.deepEqual(node, before);
  });
});
