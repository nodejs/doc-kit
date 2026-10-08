import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { loadMarkdownPlugins } from '#utils/markdown/plugins.mjs';

import { createHighlighter, getHighlighter } from '../highlighter.mjs';

const dir = mkdtempSync(join(tmpdir(), 'doc-kit-shiki-'));

/**
 * Writes a module, returning its path.
 *
 * @param {string} name
 * @param {string} source
 */
const writeModule = (name, source) => {
  writeFileSync(join(dir, name), source);

  return join(dir, name);
};

const grammar = {
  name: 'oxcconf',
  displayName: 'Oxc Config',
  scopeName: 'source.oxcconf',
  patterns: [{ match: '\\bon\\b', name: 'keyword.control.oxcconf' }],
};

describe('createHighlighter', () => {
  it('highlights every language Shiki bundles, in the default themes', async () => {
    const highlighter = await createHighlighter();

    assert.equal(highlighter.resolveLanguage('rust'), 'rust');
    assert.equal(highlighter.resolveLanguage('oxcconf'), 'text');
    assert.deepStrictEqual(highlighter.shiki.getLoadedThemes(), [
      'github-light-default',
      'nord',
    ]);
  });

  it('takes more languages, aliases, themes, and transformers', async () => {
    const highlighter = await createHighlighter({
      langs: [
        grammar,
        writeModule(
          'grammar.json',
          JSON.stringify({ ...grammar, name: 'json-conf', scopeName: 'json' })
        ),
      ],
      langAlias: { conf: 'ini' },
      themes: {
        light: 'github-light',
        dark: writeModule('theme.json', JSON.stringify({ type: 'dark' })),
      },
      transformers: [
        writeModule(
          'transformers.mjs',
          `export default [{
            line(node) {
              this.addClassToHast(node, 'tagged');
            },
          }];`
        ),
      ],
    });

    assert.equal(highlighter.resolveLanguage('oxcconf'), 'oxcconf');
    assert.equal(highlighter.resolveLanguage('json-conf'), 'json-conf');
    assert.equal(
      highlighter.highlightToHtml('[section]', 'conf'),
      highlighter.highlightToHtml('[section]', 'ini')
    );

    // A theme without a name is named after its scheme
    assert.deepStrictEqual(highlighter.shiki.getLoadedThemes(), [
      'github-light',
      'custom-dark',
    ]);

    assert.match(
      highlighter.highlightToHtml('minify on', 'oxcconf'),
      /class="line tagged"/
    );
  });

  it('gives the same highlighter for the same options', async () => {
    const highlighter = await createHighlighter({ langs: [grammar] });

    assert.equal(await createHighlighter({ langs: [grammar] }), highlighter);
    assert.notEqual(await createHighlighter(), highlighter);
  });
});

describe('getHighlighter', () => {
  const shiki = import.meta.resolve('../rehype.mjs');

  it('gives the highlighter of the Shiki plugin of a pipeline', async () => {
    await loadMarkdownPlugins(
      { name: 'highlighting', markdown: { rehypePlugins: [shiki] } },
      { rehypePlugins: [[shiki, { langAlias: { conf: 'ini' } }]] }
    );

    assert.equal(
      getHighlighter('highlighting'),
      await createHighlighter({ langAlias: { conf: 'ini' } })
    );
  });

  it('throws for a pipeline not highlighting code', async () => {
    await loadMarkdownPlugins({
      name: 'plain',
      markdown: { rehypePlugins: ['...'] },
    });

    assert.throws(() => getHighlighter('plain'), {
      message: 'The Markdown pipeline of "plain" does not highlight code',
    });
  });
});
