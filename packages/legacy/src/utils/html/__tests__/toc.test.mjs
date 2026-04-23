'use strict';

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import buildToC, {
  parseNavigationNode,
  parseToCNode,
  wrapToC,
} from '../toc.mjs';

describe('buildToC', () => {
  const identityParser = ({ heading }) => heading.data.name;

  it('returns an empty string when there are no entries', () => {
    assert.strictEqual(
      buildToC([], { maxDepth: 5, parser: identityParser }),
      ''
    );
  });

  it('filters out entries whose heading has no name', () => {
    const entries = [
      { heading: { depth: 1, data: { name: 'A' } } },
      { heading: { depth: 1, data: {} } },
      { heading: { depth: 1, data: { name: 'B' } } },
    ];

    assert.strictEqual(
      buildToC(entries, { maxDepth: 5, parser: identityParser }),
      '- A\n- B\n'
    );
  });

  it('indents entries based on their heading depth', () => {
    const entries = [
      { heading: { depth: 1, data: { name: 'Root' } } },
      { heading: { depth: 2, data: { name: 'Child' } } },
      { heading: { depth: 3, data: { name: 'Grandchild' } } },
    ];

    assert.strictEqual(
      buildToC(entries, { maxDepth: 5, parser: identityParser }),
      '- Root\n  - Child\n    - Grandchild\n'
    );
  });

  it('skips entries deeper than maxDepth', () => {
    const entries = [
      { heading: { depth: 1, data: { name: 'A' } } },
      { heading: { depth: 2, data: { name: 'B' } } },
      { heading: { depth: 3, data: { name: 'C' } } },
    ];

    assert.strictEqual(
      buildToC(entries, { maxDepth: 2, parser: identityParser }),
      '- A\n  - B\n'
    );
  });
});

describe('parseNavigationNode', () => {
  it('renders a navigation link for the api', () => {
    const html = parseNavigationNode({
      api: 'fs',
      heading: { data: { name: 'File system' } },
    });

    assert.strictEqual(
      html,
      '<a class="nav-fs" href="fs.html">File system</a>'
    );
  });
});

describe('parseToCNode', () => {
  it('renders a plain link when no stability is present', () => {
    const html = parseToCNode({
      api: 'fs',
      heading: { data: { slug: 'fs_readfile', text: 'fs.readFile()' } },
    });

    assert.strictEqual(html, '<a href="fs.html#fs_readfile">fs.readFile()</a>');
  });

  it('wraps the link in a stability span when stability info is provided', () => {
    const html = parseToCNode({
      api: 'fs',
      stability: { data: { index: '2' } },
      heading: { data: { slug: 'fs_readfile', text: 'fs.readFile()' } },
    });

    assert.strictEqual(
      html,
      '<span class="stability_2"><a href="fs.html#fs_readfile">fs.readFile()</a></span>'
    );
  });
});

describe('wrapToC', () => {
  it('wraps a non-empty ToC in the details element', () => {
    assert.strictEqual(
      wrapToC('<ul><li>entry</li></ul>'),
      '<details role="navigation" id="toc" open><summary>Table of contents</summary><ul><li>entry</li></ul></details>'
    );
  });

  it('returns an empty string for empty ToC input', () => {
    assert.strictEqual(wrapToC(''), '');
    assert.strictEqual(wrapToC(null), '');
    assert.strictEqual(wrapToC(undefined), '');
  });
});
