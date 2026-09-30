import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  default as getConfig,
  setConfig,
} from '@doc-kit/core/utils/configuration/index.mjs';

import {
  buildAssetTags,
  buildPreloads,
  buildHead,
  buildSpeculationRules,
  pageFileName,
  populateWithEvaluation,
  resolvePageRoot,
} from '../processing.mjs';

await setConfig({
  target: ['html'],
  version: 'v22.0.0',
  changelog: [],
  generators: {
    html: {
      useAbsoluteURLs: false,
      baseURL: 'https://nodejs.org/docs',
    },
  },
});

describe('populateWithEvaluation', () => {
  it('substitutes simple ${variable} placeholders', () => {
    const result = populateWithEvaluation('Hello ${name}!', { name: 'World' });
    assert.strictEqual(result, 'Hello World!');
  });

  it('supports multiple variables', () => {
    const result = populateWithEvaluation('${greeting} ${name}!', {
      greeting: 'Hi',
      name: 'Node',
    });
    assert.strictEqual(result, 'Hi Node!');
  });

  it('supports JavaScript expressions', () => {
    const result = populateWithEvaluation('${value > 5 ? "big" : "small"}', {
      value: 10,
    });
    assert.strictEqual(result, 'big');
  });

  it('supports ternary expressions for conditional content', () => {
    const result = populateWithEvaluation(
      '${showExtra ? "extra content" : ""}',
      { showExtra: false }
    );
    assert.strictEqual(result, '');
  });

  it('handles JSON.stringify for objects', () => {
    const obj = { key: 'value' };
    const result = populateWithEvaluation('${JSON.stringify(data)}', {
      data: obj,
    });
    assert.strictEqual(result, '{"key":"value"}');
  });

  it('preserves surrounding HTML content', () => {
    const result = populateWithEvaluation(
      '<title>${title}</title><link href="${root}styles.css" />',
      { title: 'Test Page', root: '../' }
    );
    assert.strictEqual(
      result,
      '<title>Test Page</title><link href="../styles.css" />'
    );
  });

  it('handles empty string values', () => {
    const result = populateWithEvaluation('[${content}]', { content: '' });
    assert.strictEqual(result, '[]');
  });

  it('handles numeric values', () => {
    const result = populateWithEvaluation('count: ${count}', { count: 42 });
    assert.strictEqual(result, 'count: 42');
  });
});

describe('resolvePageRoot', () => {
  it('keeps relative roots for regular pages', () => {
    const result = resolvePageRoot({ path: '/api/fs' });
    assert.strictEqual(result, '../');
  });

  it('uses the server root for synthetic pages', () => {
    const result = resolvePageRoot({
      path: '/404',
      synthetic: true,
    });
    assert.strictEqual(result, '/');
  });

  it('uses the configured base URL for synthetic pages with absolute URLs', async () => {
    getConfig('html').useAbsoluteURLs = true;
    getConfig('html').baseURL = 'https://example.com/docs';

    const result = resolvePageRoot({
      path: '/404',
      synthetic: true,
    });
    assert.strictEqual(result, 'https://example.com/docs/');

    getConfig('html').useAbsoluteURLs = false;
  });
});

describe('buildPreloads', () => {
  const fonts = [
    'assets/open-sans-latin-wght-normal-abc.woff2',
    'assets/ibm-plex-mono-latin-400-normal-def.woff2',
  ];

  it('resolves every font against the page root', () => {
    const result = buildPreloads(fonts, '../');

    // A hint per font, or the unlisted ones load late after all.
    assert.strictEqual(result.match(/rel="preload"/g).length, fonts.length);

    for (const font of fonts) {
      assert.ok(result.includes(`href="../${font}"`));
    }
  });

  it('keeps an absolute root absolute', () => {
    const result = buildPreloads(fonts, 'https://nodejs.org/docs/');

    assert.ok(result.includes(`href="https://nodejs.org/docs/${fonts[0]}"`));
  });

  it('renders crossorigin valueless, since fonts are fetched in CORS mode', () => {
    // Without it the stylesheet re-fetches the font instead of reusing it.
    const hints = buildPreloads(fonts, './').split('\n');

    for (const hint of hints) {
      assert.match(hint, /as="font" type="font\/woff2" crossorigin \/>$/);
    }
  });

  it('renders nothing without fonts', () => {
    assert.strictEqual(buildPreloads([], './'), '');
  });
});

describe('buildSpeculationRules', () => {
  /**
   * The pattern a page's rules exclude from prefetching, resolved as the
   * browser resolves it: against the page's own URL.
   */
  const excluded = (root, page) => {
    const [{ where }] = JSON.parse(buildSpeculationRules(root)).prefetch;
    const [, { not }] = where.and;

    return new URLPattern(not.href_matches, page);
  };

  it('prefetches same-origin links on hover or press', () => {
    const [rule] = JSON.parse(buildSpeculationRules('./')).prefetch;

    assert.deepStrictEqual(rule.where.and[0], { href_matches: '/*' });
    assert.strictEqual(rule.eagerness, 'moderate');
  });

  it("leaves the site's own pages to the client-side router", () => {
    for (const [root, page] of [
      ['./', 'https://nodejs.org/docs/latest/api/fs.html'],
      ['../', 'https://nodejs.org/docs/latest/api/fs/promises.html'],
      ['../../', 'https://nodejs.org/docs/latest/api/fs/promises/open.html'],
    ]) {
      const site = excluded(root, page);

      assert.ok(site.test('https://nodejs.org/docs/latest/api/fs.html'), root);
      assert.ok(site.test('https://nodejs.org/docs/latest/api/fs/x.html#y'));
      assert.ok(!site.test('https://nodejs.org/learn/getting-started'), root);
      assert.ok(!site.test('https://nodejs.org/docs/latest-v22.x/api/fs.html'));
    }
  });

  it('keeps an absolute root absolute', () => {
    const site = excluded(
      'https://nodejs.org/docs/',
      'https://nodejs.org/docs/fs.html'
    );

    assert.ok(site.test('https://nodejs.org/docs/fs.html'));
    assert.ok(!site.test('https://nodejs.org/learn/'));
  });
});

describe('buildHead', () => {
  it('renders meta tags from attribute bags', () => {
    const result = buildHead({
      meta: [
        { name: 'description', content: 'Docs' },
        { property: 'og:type', content: 'website' },
      ],
      links: [],
      html: [],
    });

    assert.match(result, /<meta name="description" content="Docs" \/>/);
    assert.match(result, /<meta property="og:type" content="website" \/>/);
  });

  it('renders boolean attributes as valueless and omits nullish ones', () => {
    const result = buildHead({
      meta: [],
      links: [
        { rel: 'preconnect', href: 'https://a.example' },
        { rel: 'preconnect', href: 'https://b.example', crossorigin: true },
        { rel: 'icon', href: 'https://c.example', integrity: null },
      ],
      html: [],
    });

    // Two distinct preconnect tags prove arrays beat a `rel → href` map.
    assert.match(
      result,
      /<link rel="preconnect" href="https:\/\/a\.example" \/>/
    );
    assert.match(
      result,
      /<link rel="preconnect" href="https:\/\/b\.example" crossorigin \/>/
    );
    // `integrity: null` is dropped entirely.
    assert.match(result, /<link rel="icon" href="https:\/\/c\.example" \/>/);
  });

  it('appends raw HTML strings verbatim', () => {
    const result = buildHead({
      meta: [],
      links: [],
      html: ['<meta name="theme-color" content="#000" />'],
    });

    assert.match(result, /<meta name="theme-color" content="#000" \/>/);
  });

  it('returns an empty string when nothing is configured', () => {
    assert.strictEqual(buildHead({ meta: [], links: [], html: [] }), '');
  });
});

describe('buildAssetTags', () => {
  const assets = {
    scripts: ['assets/client-abc.js'],
    preloads: ['assets/shared-def.js'],
    stylesheets: ['assets/style-ghi.css'],
  };

  it('resolves every asset against the page root, router data tag first', () => {
    const tags = buildAssetTags(assets, '../').split('\n');

    assert.deepStrictEqual(
      tags.map(tag => tag.trim()),
      [
        `<script type="application/json" data-router>${JSON.stringify({ root: '../', assets: ['../assets/client-abc.js', '../assets/style-ghi.css'] })}</script>`,
        '<script type="module" crossorigin src="../assets/client-abc.js"></script>',
        '<link rel="modulepreload" crossorigin href="../assets/shared-def.js" />',
        '<link rel="stylesheet" crossorigin href="../assets/style-ghi.css" />',
      ]
    );
  });

  it('keeps an absolute root absolute', () => {
    const tags = buildAssetTags(assets, 'https://example.com/docs/');

    assert.ok(
      tags.includes('src="https://example.com/docs/assets/client-abc.js"')
    );
  });

  it('renders only the router tag for an empty asset list', () => {
    assert.strictEqual(
      buildAssetTags({ scripts: [], preloads: [], stylesheets: [] }, './'),
      '<script type="application/json" data-router>{"root":"./","assets":[]}</script>'
    );
  });
});

describe('pageFileName', () => {
  it('derives the output file from the page path', () => {
    assert.strictEqual(pageFileName({ path: '/api/fs' }), 'api/fs.html');
    assert.strictEqual(pageFileName({ path: '/404' }), '404.html');
  });
});
