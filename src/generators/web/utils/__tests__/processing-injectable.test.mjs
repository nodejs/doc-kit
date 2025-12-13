import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { executeServerCode, processWithCodeMaps } from '../processing.mjs';

describe('generators/web/utils - processing (injectable)', () => {
  it('executeServerCode accepts injected bundler and chunked require', async () => {
    const serverCodeMap = new Map([[`api.jsx`, 'ignored']]);

    const fakeRequire = () => ({ fs: true });

    const mockBundle = async () => ({
      chunks: [
        { fileName: 'api.js', isEntry: true, code: 'return "<p>ok</p>";' },
      ],
      css: 'body{}',
    });

    const { pages, css } = await executeServerCode(serverCodeMap, fakeRequire, {
      bundleCode: mockBundle,
      createChunkedRequire: (chunks, req) => req,
    });

    assert.equal(pages.get('api.js'), '<p>ok</p>');
    assert.equal(css, 'body{}');
  });

  it('processWithCodeMaps builds final HTML and css using injected bundlers', async () => {
    const serverCodeMap = new Map([[`api.jsx`, 'ignored']]);
    const clientCodeMap = new Map([[`api.jsx`, 'ignored']]);

    const entries = [
      { data: { api: 'api', heading: { data: { name: 'My API' } } } },
    ];

    const template =
      '<title>{{title}}</title>{{dehydrated}}{{importMap}}{{entrypoint}}{{speculationRules}}';

    const fakeRequire = () => ({ fs: true });

    const mockServerBundle = async () => ({
      chunks: [
        {
          fileName: 'api.js',
          isEntry: true,
          code: 'return "<div>server</div>";',
        },
      ],
      css: 's{}',
    });

    const mockClientBundle = async () => ({
      chunks: [{ fileName: 'api.js', isEntry: true, code: '/* client */' }],
      css: 'c{}',
      importMap: '{}',
    });

    const { results, css } = await processWithCodeMaps(
      serverCodeMap,
      clientCodeMap,
      entries,
      template,
      fakeRequire,
      { version: { version: '1.0.0' } },
      {
        bundleCode: async map =>
          map === serverCodeMap
            ? await mockServerBundle()
            : await mockClientBundle(),
        createChunkedRequire: (chunks, req) => req,
        transform: ({ code }) => ({ code: Buffer.from(String(code)) }),
      }
    );

    assert.equal(results.length, 1);
    const html = results[0].html.toString();
    assert.match(html, /<div>server<\/div>/);
    assert.match(html, /My API/);
    assert.ok(String(css).includes('s{}') || String(css).includes('c{}'));
  });
});
