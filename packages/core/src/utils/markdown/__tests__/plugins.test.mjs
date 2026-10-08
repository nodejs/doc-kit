import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { pathToFileURL } from 'node:url';

import { getMarkdownPlugins, loadMarkdownPlugins } from '../plugins.mjs';

const dir = mkdtempSync(join(tmpdir(), 'doc-kit-markdown-plugins-'));

/**
 * Writes a module, returning its URL, as configuration resolves it.
 *
 * @param {string} name
 * @param {string} source
 */
const writeModule = (name, source) => {
  writeFileSync(join(dir, name), source);

  return pathToFileURL(join(dir, name)).href;
};

const plugin = writeModule('plugin.mjs', 'export default function plugin() {}');
const other = writeModule('other.mjs', 'export default function other() {}');
const list = writeModule(
  'list.mjs',
  `import plugin from './plugin.mjs';
  export default [[plugin, { from: 'list' }]];`
);
const preset = writeModule(
  'preset.mjs',
  `import plugin from './plugin.mjs';
  export default { plugins: [plugin] };`
);
const setUp = writeModule(
  'set-up.mjs',
  `export async function load(options) {
    return Object.assign(function setUp() {}, { options });
  }`
);

const { default: pluginFunction } = await import(plugin);
const { default: otherFunction } = await import(other);

/**
 * A generator whose Markdown pipeline only has the configured plugins.
 *
 * @param {string} name
 */
const configurable = name => ({
  name,
  markdown: {
    remarkPlugins: ['...'],
    rehypePlugins: ['...'],
    recmaPlugins: ['...'],
  },
});

describe('loadMarkdownPlugins', () => {
  it('loads plugins as `processor.use()` takes them', async () => {
    await loadMarkdownPlugins(configurable('formats'), {
      remarkPlugins: [plugin, [other, { a: 1 }]],
      rehypePlugins: [list],
      recmaPlugins: [preset],
    });

    assert.deepStrictEqual(getMarkdownPlugins('formats'), {
      remarkPlugins: [[pluginFunction], [otherFunction, { a: 1 }]],
      // A list is used as a preset
      rehypePlugins: [{ plugins: [[pluginFunction, { from: 'list' }]] }],
      recmaPlugins: [{ plugins: [pluginFunction] }],
    });
  });

  it('loads a plugin through its `load`, given the options', async () => {
    await loadMarkdownPlugins(configurable('setting-up'), {
      rehypePlugins: [[setUp, { ready: true }]],
    });

    const [[setUpPlugin, ...options]] =
      getMarkdownPlugins('setting-up').rehypePlugins;

    assert.equal(setUpPlugin.name, 'setUp');
    assert.deepStrictEqual(setUpPlugin.options, { ready: true });
    assert.deepStrictEqual(options, []);
  });

  it('puts the configured plugins in place of `...`', async () => {
    await loadMarkdownPlugins(
      {
        name: 'pipeline',
        markdown: {
          remarkPlugins: [other, '...', [other, { last: true }]],
          // Without `...`, a list takes no configured plugins
          rehypePlugins: [other],
        },
      },
      { remarkPlugins: [plugin], rehypePlugins: [plugin] }
    );

    assert.deepStrictEqual(getMarkdownPlugins('pipeline'), {
      remarkPlugins: [
        [otherFunction],
        [pluginFunction],
        [otherFunction, { last: true }],
      ],
      rehypePlugins: [[otherFunction]],
      recmaPlugins: [],
    });

    // The generator's own plugins, without the configured ones
    assert.deepStrictEqual(getMarkdownPlugins('pipeline', false), {
      remarkPlugins: [[otherFunction], [otherFunction, { last: true }]],
      rehypePlugins: [[otherFunction]],
      recmaPlugins: [],
    });
  });

  it('configures the plugins it has, rather than running them twice', async () => {
    await loadMarkdownPlugins(
      {
        name: 'configuring',
        markdown: {
          rehypePlugins: [[plugin, { list: [1], nested: { a: 1 } }], '...'],
        },
      },
      {
        rehypePlugins: [
          [plugin, { list: [2], nested: { b: 2 } }],
          // As a generator's own plugins add to the global ones
          [setUp, { list: [1] }],
          other,
          [setUp, { list: [2] }],
        ],
      }
    );

    const [own, [setUpPlugin], ...rest] =
      getMarkdownPlugins('configuring').rehypePlugins;

    // Options merge: lists add up, and objects merge
    assert.deepStrictEqual(own, [
      pluginFunction,
      { list: [1, 2], nested: { a: 1, b: 2 } },
    ]);
    assert.deepStrictEqual(setUpPlugin.options, { list: [1, 2] });
    assert.deepStrictEqual(rest, [[otherFunction]]);

    // Its own plugins are configured without the configured ones too
    assert.deepStrictEqual(getMarkdownPlugins('configuring', false), {
      remarkPlugins: [],
      rehypePlugins: [own],
      recmaPlugins: [],
    });
  });

  it('rejects the plugins it cannot import', async () => {
    await assert.rejects(
      loadMarkdownPlugins(configurable('missing'), {
        remarkPlugins: [`${plugin}-missing`],
      }),
      { code: 'ERR_MODULE_NOT_FOUND' }
    );
  });

  it('loads each generator its own plugins, once', async () => {
    const one = configurable('one');
    const markdown = { rehypePlugins: [[plugin, { for: 'one' }]] };

    await loadMarkdownPlugins(one, markdown);
    await loadMarkdownPlugins(configurable('two'), {
      rehypePlugins: [[plugin, { for: 'two' }]],
    });

    const plugins = getMarkdownPlugins('one');

    assert.deepStrictEqual(plugins.rehypePlugins, [
      [pluginFunction, { for: 'one' }],
    ]);
    assert.deepStrictEqual(getMarkdownPlugins('two').rehypePlugins, [
      [pluginFunction, { for: 'two' }],
    ]);

    // As workers do for each task, from a copy of the configuration
    await loadMarkdownPlugins(one, structuredClone(markdown));

    assert.equal(getMarkdownPlugins('one'), plugins);

    // A generator without a pipeline has none to load
    await loadMarkdownPlugins({ name: 'none' }, markdown);

    assert.throws(() => getMarkdownPlugins('none'), {
      message: 'The Markdown pipeline of "none" is not loaded on this thread',
    });
  });
});
