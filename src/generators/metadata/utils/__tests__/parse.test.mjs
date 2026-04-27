'use strict';

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { u } from 'unist-builder';

import { parseApiDoc } from '../parse.mjs';

const path = 'fs';
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
      const results = parseApiDoc({ path, tree }, typeMap);

      assert.strictEqual(results.length, 1);
    });

    it('populates heading data with text and depth', () => {
      const tree = u('root', [h('File System')]);
      const [entry] = parseApiDoc({ path, tree }, typeMap);

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
      const results = parseApiDoc({ path, tree }, typeMap);

      assert.strictEqual(results.length, 3);
    });

    it('assigns correct slugs to each entry', () => {
      const tree = u('root', [
        h('First'),
        u('paragraph', [u('text', 'Content A.')]),
        h('Second'),
        u('paragraph', [u('text', 'Content B.')]),
      ]);
      const results = parseApiDoc({ path, tree }, typeMap);

      assert.strictEqual(results[0].heading.data.slug, 'first');
      assert.strictEqual(results[1].heading.data.slug, 'second');
    });
  });

  describe('YAML metadata', () => {
    it('extracts added_in', () => {
      const tree = u('root', [h('fs'), yaml('added: v0.1.0')]);
      const [entry] = parseApiDoc({ path, tree }, typeMap);

      assert.strictEqual(entry.added, 'v0.1.0');
    });

    it('extracts deprecated_in', () => {
      const tree = u('root', [
        h('oldMethod'),
        yaml('added: v1.0.0\ndeprecated: v2.0.0'),
      ]);
      const [entry] = parseApiDoc({ path, tree }, typeMap);

      assert.strictEqual(entry.added, 'v1.0.0');
      assert.strictEqual(entry.deprecated, 'v2.0.0');
    });

    it('extracts removed_in', () => {
      const tree = u('root', [h('removedMethod'), yaml('removed: v3.0.0')]);
      const [entry] = parseApiDoc({ path, tree }, typeMap);

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
      const [entry] = parseApiDoc({ path, tree }, typeMap);

      assert.strictEqual(entry.changes.length, 1);
      assert.strictEqual(entry.changes[0].version, 'v7.0.0');
      assert.strictEqual(
        entry.changes[0]['pr-url'],
        'https://github.com/nodejs/node/pull/7897'
      );
    });

    it('extracts tags from a plain comment', () => {
      const tree = u('root', [h('method'), u('html', '<!-- legacy -->')]);
      const [entry] = parseApiDoc({ path, tree }, typeMap);

      assert.deepStrictEqual(entry.tags, ['legacy']);
    });
  });

  describe('stability index', () => {
    it('captures stability index and description', () => {
      const tree = u('root', [h('fs'), stability('Stability: 2 - Stable')]);
      const [entry] = parseApiDoc({ path, tree }, typeMap);

      assert.strictEqual(entry.stability.data.index, '2');
      assert.strictEqual(entry.stability.data.description, 'Stable');
    });

    it('captures multi-word stability description', () => {
      const tree = u('root', [
        h('crypto'),
        stability('Stability: 1 - Experimental: This API is experimental.'),
      ]);
      const [entry] = parseApiDoc({ path, tree }, typeMap);

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
      const [entry] = parseApiDoc({ path: '/documentation', tree }, typeMap);

      assert.ok(!('stability' in entry));
    });

    it('has empty stability when no blockquote is present', () => {
      const tree = u('root', [h('fs')]);
      const [entry] = parseApiDoc({ path, tree }, typeMap);

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
      const [entry] = parseApiDoc({ path, tree }, typeMap);

      assert.strictEqual(findLink(entry)?.url, 'https://example.com');
    });
  });

  describe('type references', () => {
    it('transforms {type} references into links', () => {
      const tree = u('root', [
        h('fs'),
        u('paragraph', [u('text', '{string}')]),
      ]);
      const [entry] = parseApiDoc({ path, tree }, typeMap);

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
      const [entry] = parseApiDoc({ path, tree }, typeMap);

      assert.strictEqual(findLink(entry)?.url, 'events.html');
    });

    it('preserves hash fragments when converting .md links', () => {
      const tree = u('root', [
        h('fs'),
        u('paragraph', [
          u('link', { url: 'events.md#some-section' }, [u('text', 'events')]),
        ]),
      ]);
      const [entry] = parseApiDoc({ path, tree }, typeMap);

      assert.strictEqual(findLink(entry)?.url, 'events.html#some-section');
    });

    it('strips subdirectory prefix from nested .md links', () => {
      const tree = u('root', [
        h('fs'),
        u('paragraph', [
          u('link', { url: 'namespaces/comparators.md' }, [
            u('text', 'comparators'),
          ]),
        ]),
      ]);
      const [entry] = parseApiDoc({ path, tree }, typeMap);

      assert.strictEqual(findLink(entry)?.url, 'comparators.html');
    });

    it('strips subdirectory prefix and preserves hash fragments', () => {
      const tree = u('root', [
        h('fs'),
        u('paragraph', [
          u('link', { url: 'namespaces/comparators.md#some-section' }, [
            u('text', 'comparators'),
          ]),
        ]),
      ]);
      const [entry] = parseApiDoc({ path, tree }, typeMap);

      assert.strictEqual(findLink(entry)?.url, 'comparators.html#some-section');
    });

    it('ignores .md full URLs with any protocol', () => {
      const protocolLinks = [
        'https://github.com/example/config.md',
        'http://internal-server.com/docs.md',
        'file:///C:/Shared/docs/readme.md',
      ];

      for (const url of protocolLinks) {
        const tree = u('root', [
          h('fs'),
          u('paragraph', [u('link', { url }, [u('text', 'external link')])]),
        ]);
        const [entry] = parseApiDoc({ path, tree }, typeMap);

        // Assert that the URL comes out exactly as it went in
        assert.strictEqual(
          findLink(entry)?.url,
          url,
          `Failed to ignore protocol: ${url}`
        );
      }
    });
  });

  describe('document without headings', () => {
    it('produces one entry for content with no headings', () => {
      const tree = u('root', [
        u('paragraph', [u('text', 'Just some text without any headings.')]),
      ]);
      const results = parseApiDoc({ path, tree }, typeMap);

      assert.strictEqual(results.length, 1);
    });

    it('returns an empty array for an empty document', () => {
      const tree = u('root', []);
      const results = parseApiDoc({ path, tree }, typeMap);

      assert.strictEqual(results.length, 0);
    });
  });

  describe('top-level nodes (YAML frontmatter)', () => {
    it('captures top-level frontmatter in the first entry', () => {
      const tree = u('root', [
        u('yaml', 'layout: home\ncontributors: [shams]'),
        h('First Heading'),
        u('paragraph', [u('text', 'First content.')]),
        h('Second Heading', 2),
        u('paragraph', [u('text', 'Second content.')]),
      ]);
      const results = parseApiDoc({ path, tree }, typeMap);

      assert.strictEqual(results.length, 2);

      const firstContent = results[0].content.children;
      assert.strictEqual(firstContent.length, 3);
      assert.strictEqual(firstContent[0].type, 'yaml');
      assert.strictEqual(firstContent[1].type, 'heading');

      const secondContent = results[1].content.children;
      assert.strictEqual(secondContent.length, 2);
      assert.strictEqual(secondContent[0].type, 'heading');
    });
  });
});
