import { strictEqual, deepStrictEqual } from 'node:assert';
import { describe, it } from 'node:test';

import { u } from 'unist-builder';
import { VFile } from 'vfile';

import { parseApiDoc } from '../utils/parse.mjs';

describe('generators/metadata/utils/parse', () => {
  it('parses heading, stability, YAML and converts markdown links', () => {
    const tree = u('root', [
      u('heading', { depth: 1 }, [u('text', 'My API')]),
      u('blockquote', [u('paragraph', [u('text', 'Stability: 2 - stable')])]),
      u('html', '<!-- YAML\nsource_link: https://example.com\n-->'),
      u('paragraph', [
        u('text', 'See '),
        u('link', { url: 'other.md#foo' }, [u('text', 'other')]),
      ]),
    ]);

    const file = new VFile({ path: 'doc/api/my-api.md' });

    const results = parseApiDoc({ file, tree }, {});

    strictEqual(results.length, 1);
    const [entry] = results;

    strictEqual(entry.source_link, 'https://example.com');
    strictEqual(entry.stability.children.length, 1);
    strictEqual(entry.stability.children[0].data.index, '2');

    // Find a paragraph child that contains a link and assert transformed URL
    const paragraph = entry.content.children.find(n => n.type === 'paragraph');
    const link = paragraph.children.find(c => c.type === 'link');
    strictEqual(link.url, 'other.html#foo');
  });

  it('inserts a fake heading when none exist', () => {
    const tree = u('root', [u('paragraph', [u('text', 'No heading content')])]);
    const file = new VFile({ path: 'doc/api/noheading.md' });

    const results = parseApiDoc({ file, tree }, {});

    strictEqual(results.length, 1);
    const [entry] = results;

    // Fake heading has empty text
    deepStrictEqual(entry.heading.data.text, '');
  });

  it('converts link references using definitions and removes definitions', () => {
    const heading = u('heading', { depth: 1 }, [u('text', 'Ref API')]);

    const linkRef = u('linkReference', { identifier: 'def1' }, [
      u('text', 'ref'),
    ]);

    const definition = u(
      'definition',
      { identifier: 'def1', url: 'https://def.example/' },
      []
    );

    const tree = u('root', [
      heading,
      u('paragraph', [u('text', 'See '), linkRef]),
      definition,
    ]);

    const file = new VFile({ path: 'doc/api/ref-api.md' });

    const results = parseApiDoc({ file, tree }, {});

    strictEqual(results.length, 1);
    const [entry] = results;

    const paragraph = entry.content.children.find(n => n.type === 'paragraph');
    const link = paragraph.children.find(c => c.type === 'link');
    strictEqual(link.url, 'https://def.example/');
  });

  it('converts type references to links using provided typeMap', () => {
    const tree = u('root', [
      u('heading', { depth: 1 }, [u('text', 'Types API')]),
      u('paragraph', [u('text', 'Type is {Foo}')]),
    ]);

    const file = new VFile({ path: 'doc/api/types.md' });

    const results = parseApiDoc({ file, tree }, { Foo: 'foo.html' });

    strictEqual(results.length, 1);
    const [entry] = results;

    const paragraph = entry.content.children.find(n => n.type === 'paragraph');
    const link = paragraph.children.find(c => c.type === 'link');
    strictEqual(link.url, 'foo.html');
  });

  it('converts unix manual references to man7 links', () => {
    const tree = u('root', [
      u('heading', { depth: 1 }, [u('text', 'Man API')]),
      u('paragraph', [u('text', 'Run ls(1) for help')]),
    ]);

    const file = new VFile({ path: 'doc/api/man.md' });

    const results = parseApiDoc({ file, tree }, {});

    strictEqual(results.length, 1);
    const [entry] = results;

    const paragraph = entry.content.children.find(n => n.type === 'paragraph');
    const link = paragraph.children.find(c => c.type === 'link');
    // should point to man7 man page for ls in section 1
    strictEqual(link.url.includes('man-pages/man1/ls.1.html'), true);
  });
});
