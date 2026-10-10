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

  it('registers a bundled language once code in it is highlighted', async () => {
    const highlighter = await createHighlighter({
      langAlias: { py: 'python' },
    });
    const loaded = () => highlighter.shiki.getLoadedLanguages();

    assert.ok(!loaded().includes('python'));
    assert.ok(!loaded().includes('javascript'));

    // By its name, an alias of its own, or one of the options
    assert.equal(highlighter.resolveLanguage('py'), 'py');
    assert.equal(highlighter.resolveLanguage('mjs'), 'mjs');

    assert.ok(loaded().includes('python'));
    assert.ok(loaded().includes('javascript'));
    assert.ok(loaded().includes('cjs'));

    assert.equal(highlighter.resolveLanguage(undefined), 'text');
    assert.equal(highlighter.resolveLanguage('plaintext'), 'plaintext');
  });

  it('lists the bundled languages without registering them', async () => {
    const highlighter = await createHighlighter({ langs: [grammar] });

    assert.deepStrictEqual(
      highlighter.langs.find(({ name }) => name === 'rust'),
      { name: 'rust', displayName: 'Rust', aliases: ['rs'] }
    );
    assert.equal(highlighter.langs.at(-1), grammar);
    assert.ok(!highlighter.shiki.getLoadedLanguages().includes('rust'));
  });

  it('registers the bundled languages a language embeds', async () => {
    const highlighter = await createHighlighter({
      langs: [
        {
          ...grammar,
          name: 'oxcscript',
          scopeName: 'source.oxcscript',
          embeddedLangs: ['javascript'],
          patterns: [{ include: 'source.js' }],
        },
      ],
    });

    assert.match(
      highlighter.highlightToHtml('const on = 1', 'oxcscript'),
      /--shiki-dark/
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
