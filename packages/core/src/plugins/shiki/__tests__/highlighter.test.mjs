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
    assert.ok(!loaded().includes('rust'));

    // By its name, an alias of its own, or one of the options
    assert.equal(highlighter.resolveLanguage('py'), 'python');
    assert.equal(highlighter.resolveLanguage('rs'), 'rs');

    assert.ok(loaded().includes('python'));
    assert.ok(loaded().includes('rust'));

    assert.equal(highlighter.resolveLanguage(undefined), 'text');
    assert.equal(highlighter.resolveLanguage('plaintext'), 'plaintext');
  });

  it('highlights JavaScript as TypeScript, and C++ as C', async () => {
    const highlighter = await createHighlighter();
    const loaded = () => highlighter.shiki.getLoadedLanguages();

    for (const language of ['javascript', 'JS', 'mjs', 'cjs']) {
      assert.equal(highlighter.resolveLanguage(language), 'typescript');
    }

    assert.equal(highlighter.resolveLanguage('cpp'), 'c');
    assert.equal(highlighter.resolveLanguage('c++'), 'c');
    assert.ok(!loaded().includes('cpp'));

    // Even once a grammar that has them as its own aliases is registered
    assert.equal(highlighter.resolveLanguage('coffee'), 'coffee');
    assert.ok(loaded().includes('javascript'));
    assert.equal(highlighter.resolveLanguage('js'), 'typescript');

    // Not the names every object inherits
    assert.equal(highlighter.resolveLanguage('constructor'), 'text');
  });

  it('takes aliases over the default ones', async () => {
    const highlighter = await createHighlighter({
      langAlias: { cpp: 'cpp', js: 'javascript' },
    });

    assert.equal(highlighter.resolveLanguage('cpp'), 'cpp');
    assert.equal(highlighter.resolveLanguage('js'), 'javascript');
    assert.equal(highlighter.resolveLanguage('mjs'), 'typescript');
    assert.ok(highlighter.shiki.getLoadedLanguages().includes('cpp'));
  });

  it('follows configured aliases, and finds languages named in any case', async () => {
    const highlighter = await createHighlighter({
      langs: [{ ...grammar, name: 'OxcConf', scopeName: 'source.oxcconf2' }],
      langAlias: {
        a: 'b',
        b: 'python',
        loop: 'pool',
        pool: 'loop',
        oc: 'OxcConf',
        conf: 'INI',
      },
    });

    assert.equal(highlighter.resolveLanguage('a'), 'python');
    assert.equal(highlighter.resolveLanguage('loop'), 'text');
    assert.equal(highlighter.resolveLanguage('Python'), 'python');
    assert.equal(highlighter.resolveLanguage('oc'), 'OxcConf');
    assert.equal(highlighter.resolveLanguage('conf'), 'ini');
    assert.equal(
      highlighter.highlightToHtml('[section]', 'conf'),
      highlighter.highlightToHtml('[section]', 'ini')
    );
  });

  it('highlights with a language of `langs` an alias leads to', async () => {
    const highlighter = await createHighlighter({
      langs: [
        {
          ...grammar,
          name: 'javascript',
          aliases: ['js'],
          scopeName: 'source.oxc-js',
        },
      ],
      langAlias: { js: 'javascript' },
    });

    assert.equal(highlighter.resolveLanguage('js'), 'javascript');
    assert.match(
      highlighter.highlightToHtml('minify on', 'js'),
      /--shiki-dark/
    );
    assert.ok(!highlighter.shiki.getLoadedLanguages().includes('typescript'));
    assert.equal(highlighter.resolveLanguage('mjs'), 'typescript');
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

  it('registers the bundled languages a language embeds lazily', async () => {
    const highlighter = await createHighlighter({
      langs: [
        {
          ...grammar,
          name: 'oxcdoc',
          scopeName: 'source.oxcdoc',
          embeddedLangsLazy: ['rust'],
          patterns: [{ include: 'source.rust' }],
        },
      ],
    });

    assert.ok(highlighter.shiki.getLoadedLanguages().includes('rust'));
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
