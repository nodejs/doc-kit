'use strict';

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { u } from 'unist-builder';

import { parseApiDoc } from '../parse.mjs';

const file = { stem: 'fs', basename: 'fs.md' };
const typeMap = {};

const h = (text, depth = 1) => u('heading', { depth }, [u('text', text)]);
const yaml = content => u('html', `<!-- YAML\n${content}\n-->`);
const stability = text => u('blockquote', [u('paragraph', [u('text', text)])]);

const findLink = entry => {
  const paragraph = entry.content.children.find(n => n.type === 'paragraph');
  return paragraph?.children?.find(n => n.type === 'link');
};

describe('parseApiDoc', () => {
  describe('basic heading', () => {
    it('produces one entry for a single heading', () => {
      const tree = u('root', [
        h('fs'),
        u('paragraph', [u('text', 'Content.')]),
      ]);
      const results = parseApiDoc({ file, tree }, typeMap);

      assert.strictEqual(results.length, 1);
    });

    it('populates heading data with text and depth', () => {
      const tree = u('root', [h('File System')]);
      const [entry] = parseApiDoc({ file, tree }, typeMap);

      assert.strictEqual(entry.heading.data.text, 'File System');
      assert.strictEqual(entry.heading.depth, 1);
    });
  });

  describe('multiple headings', () => {
    it('produces one entry per heading', () => {
      const tree = u('root', [
        h('Module'),
        u('paragraph', [u('text', 'Intro.')]),
        h('Class Foo', 2),
        u('paragraph', [u('text', 'Class docs.')]),
        h('foo.bar()', 2),
        u('paragraph', [u('text', 'Method docs.')]),
      ]);
      const results = parseApiDoc({ file, tree }, typeMap);

      assert.strictEqual(results.length, 3);
    });

    it('assigns correct slugs to each entry', () => {
      const tree = u('root', [
        h('First'),
        u('paragraph', [u('text', 'Content A.')]),
        h('Second'),
        u('paragraph', [u('text', 'Content B.')]),
      ]);
      const results = parseApiDoc({ file, tree }, typeMap);

      assert.strictEqual(results[0].slug, 'first');
      assert.strictEqual(results[1].slug, 'second');
    });
  });

  describe('YAML metadata', () => {
    it('extracts added_in', () => {
      const tree = u('root', [h('fs'), yaml('added: v0.1.0')]);
      const [entry] = parseApiDoc({ file, tree }, typeMap);

      assert.strictEqual(entry.added, 'v0.1.0');
    });

    it('extracts deprecated_in', () => {
      const tree = u('root', [
        h('oldMethod'),
        yaml('added: v1.0.0\ndeprecated: v2.0.0'),
      ]);
      const [entry] = parseApiDoc({ file, tree }, typeMap);

      assert.strictEqual(entry.added, 'v1.0.0');
      assert.strictEqual(entry.deprecated, 'v2.0.0');
    });

    it('extracts removed_in', () => {
      const tree = u('root', [h('removedMethod'), yaml('removed: v3.0.0')]);
      const [entry] = parseApiDoc({ file, tree }, typeMap);

      assert.strictEqual(entry.removed, 'v3.0.0');
    });

    it('extracts changes', () => {
      const tree = u('root', [
        h('fs.readFile'),
        yaml(
          'added: v0.1.0\n' +
            'changes:\n' +
            '  - version: v7.0.0\n' +
            '    pr-url: https://github.com/nodejs/node/pull/7897\n' +
            '    description: The callback is no longer optional.'
        ),
      ]);
      const [entry] = parseApiDoc({ file, tree }, typeMap);

      assert.strictEqual(entry.changes.length, 1);
      assert.strictEqual(entry.changes[0].version, 'v7.0.0');
      assert.strictEqual(
        entry.changes[0]['pr-url'],
        'https://github.com/nodejs/node/pull/7897'
      );
    });

    it('extracts tags from a plain comment', () => {
      const tree = u('root', [h('method'), u('html', '<!-- legacy -->')]);
      const [entry] = parseApiDoc({ file, tree }, typeMap);

      assert.deepStrictEqual(entry.tags, ['legacy']);
    });
  });

  describe('stability index', () => {
    it('captures stability index and description', () => {
      const tree = u('root', [h('fs'), stability('Stability: 2 - Stable')]);
      const [entry] = parseApiDoc({ file, tree }, typeMap);

      assert.strictEqual(entry.stability.data.index, '2');
      assert.strictEqual(entry.stability.data.description, 'Stable');
    });

    it('captures multi-word stability description', () => {
      const tree = u('root', [
        h('crypto'),
        stability('Stability: 1 - Experimental: This API is experimental.'),
      ]);
      const [entry] = parseApiDoc({ file, tree }, typeMap);

      assert.strictEqual(
        entry.stability.data.description,
        'Experimental: This API is experimental.'
      );
    });

    it('ignores stability blockquotes in the documentation file', () => {
      const tree = u('root', [
        h('Stability Index'),
        stability('Stability: 2 - Stable'),
      ]);
      const [entry] = parseApiDoc(
        { file: { stem: 'documentation', basename: 'documentation.md' }, tree },
        typeMap
      );

      assert.ok(!('stability' in entry));
    });

    it('has empty stability when no blockquote is present', () => {
      const tree = u('root', [h('fs')]);
      const [entry] = parseApiDoc({ file, tree }, typeMap);

      assert.ok(!('stability' in entry));
    });
  });

  describe('link references', () => {
    it('resolves link references to their definitions', () => {
      const tree = u('root', [
        h('fs'),
        u('paragraph', [
          u('linkReference', { identifier: 'ref', referenceType: 'full' }, [
            u('text', 'a link'),
          ]),
        ]),
        u('definition', { identifier: 'ref', url: 'https://example.com' }),
      ]);
      const [entry] = parseApiDoc({ file, tree }, typeMap);

      assert.strictEqual(findLink(entry)?.url, 'https://example.com');
    });
  });

  describe('type references', () => {
    it('transforms {type} references into links', () => {
      const tree = u('root', [
        h('fs'),
        u('paragraph', [u('text', '{string}')]),
      ]);
      const [entry] = parseApiDoc({ file, tree }, typeMap);

      assert.ok(
        findLink(entry) !== undefined,
        'expected a link node from type reference transformation'
      );
    });
  });

  describe('URL normalization', () => {
    it('converts .md links to .html', () => {
      const tree = u('root', [
        h('fs'),
        u('paragraph', [
          u('link', { url: 'events.md' }, [u('text', 'events')]),
        ]),
      ]);
      const [entry] = parseApiDoc({ file, tree }, typeMap);

      assert.strictEqual(findLink(entry)?.url, 'events.html');
    });

    it('preserves hash fragments when converting .md links', () => {
      const tree = u('root', [
        h('fs'),
        u('paragraph', [
          u('link', { url: 'events.md#some-section' }, [u('text', 'events')]),
        ]),
      ]);
      const [entry] = parseApiDoc({ file, tree }, typeMap);

      assert.strictEqual(findLink(entry)?.url, 'events.html#some-section');
    });
  });

  describe('document without headings', () => {
    it('produces one entry for content with no headings', () => {
      const tree = u('root', [
        u('paragraph', [u('text', 'Just some text without any headings.')]),
      ]);
      const results = parseApiDoc({ file, tree }, typeMap);

      assert.strictEqual(results.length, 1);
    });

    it('returns an empty array for an empty document', () => {
      const tree = u('root', []);
      const results = parseApiDoc({ file, tree }, typeMap);

      assert.strictEqual(results.length, 0);
    });
  });
});
