import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { u } from 'unist-builder';

import {
  toChanges,
  toNumbers,
  toStability,
  toVersions,
} from '../lifecycle.mjs';

describe('toVersions', () => {
  it('always yields an array of strings', () => {
    assert.deepEqual(toVersions(undefined), []);
    assert.deepEqual(toVersions(null), []);
    assert.deepEqual(toVersions('v1.0.0'), ['v1.0.0']);
    assert.deepEqual(toVersions(['v2.0.0', 'v1.5.0']), ['v2.0.0', 'v1.5.0']);
    assert.deepEqual(toVersions('REPLACEME'), ['REPLACEME']);
  });
});

describe('toNumbers', () => {
  it('always yields an array of numbers', () => {
    assert.deepEqual(toNumbers(undefined), []);
    assert.deepEqual(toNumbers(3), [3]);
    assert.deepEqual(toNumbers(['1', 2]), [1, 2]);
  });
});

describe('toChanges', () => {
  it('normalises every record', () => {
    assert.deepEqual(
      toChanges([
        {
          version: 'v1.0.0',
          'pr-url': 'https://github.com/example/pull/1',
          description: '  Trimmed.  ',
        },
        {
          version: ['v0.2.0', 'v0.1.0'],
          commit: 'abc123',
          description: 'Old.',
        },
      ]),
      [
        {
          versions: ['v1.0.0'],
          prUrl: 'https://github.com/example/pull/1',
          commit: null,
          description: 'Trimmed.',
        },
        {
          versions: ['v0.2.0', 'v0.1.0'],
          prUrl: null,
          commit: 'abc123',
          description: 'Old.',
        },
      ]
    );
  });

  it('is empty without changes', () => {
    assert.deepEqual(toChanges(undefined), []);
  });
});

describe('toStability', () => {
  const stability = (children, index = '1.1', description = '') =>
    u('blockquote', { data: { index, description } }, [
      u('paragraph', children),
    ]);

  it('is null without a stability index', () => {
    assert.equal(toStability(undefined), null);
  });

  it('keeps the sub-level and renders the description after the prefix', () => {
    const node = stability([
      u('link', { url: 'documentation.html#stability-index' }, [
        u('text', 'Stability: 1.1'),
      ]),
      u('text', ' - Active development. Use '),
      u('inlineCode', 'other()'),
      u('text', ' instead.'),
    ]);

    assert.deepEqual(toStability(node), {
      index: '1.1',
      level: 1,
      description: 'Active development. Use `other()` instead.',
    });
  });

  it('handles an unlinked prefix and a missing description', () => {
    assert.deepEqual(
      toStability(stability([u('text', 'Stability: 2 - Stable')], '2')),
      { index: '2', level: 2, description: 'Stable' }
    );

    assert.deepEqual(
      toStability(stability([u('text', 'Stability: 0')], '0', 'fallback')),
      { index: '0', level: 0, description: 'fallback' }
    );
  });
});
