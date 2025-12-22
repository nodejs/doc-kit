import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  convertJSXToCode,
  executeServerCode,
  processJSXEntries,
} from '../processing.mjs';

describe('generators/web/utils - processing', () => {
  it('convertJSXToCode uses injected toJs and builders', () => {
    const entries = [{ data: { api: 'myapi' } }];

    const toJsMock = () => ({ value: 'RAW_CODE' });

    const buildServerProgram = code => `SERVER:${code}`;
    const buildClientProgram = code => `CLIENT:${code}`;

    const { serverCodeMap, clientCodeMap } = convertJSXToCode(
      entries,
      { buildServerProgram, buildClientProgram },
      { toJs: toJsMock }
    );

    assert.equal(serverCodeMap.get('myapi.jsx'), 'SERVER:RAW_CODE');
    assert.equal(clientCodeMap.get('myapi.jsx'), 'CLIENT:RAW_CODE');
  });

  it('executeServerCode resolves otherChunks via chunked require', async () => {
    const serverCodeMap = new Map([[`api.jsx`, 'ignored']]);

    const fakeRequire = () => ({ ok: true });

    const mockBundle = async () => ({
      chunks: [
        {
          fileName: 'lib.1.js',
          isEntry: false,
          code: 'module.exports = "LIB";',
        },
        {
          fileName: 'api.js',
          isEntry: true,
          code: 'const lib = require("./lib.1.js"); return lib + "-OK";',
        },
      ],
      css: 'body{}',
    });

    const { pages, css } = await executeServerCode(serverCodeMap, fakeRequire, {
      bundleCode: mockBundle,
      createChunkedRequire: (chunks, req) => id => {
        if (id === './lib.1.js') {
          return 'LIB';
        }
        return req(id);
      },
    });

    assert.equal(pages.get('api.js'), 'LIB-OK');
    assert.equal(css, 'body{}');
  });

  it('processJSXEntries end-to-end with overrides', async () => {
    const entries = [
      { data: { api: 'api', heading: { data: { name: 'My API' } } } },
    ];

    const template =
      '<title>{{title}}</title>{{dehydrated}}{{importMap}}{{entrypoint}}{{speculationRules}}';

    const astBuilders = {
      buildServerProgram: code => `SERVER:${code}`,
      buildClientProgram: code => `CLIENT:${code}`,
    };

    const fakeRequire = () => ({ fs: true });

    const serverBundle = {
      chunks: [
        {
          fileName: 'api.js',
          isEntry: true,
          code: 'return "<div>server</div>";',
        },
      ],
      css: 's{}',
    };

    const clientBundle = {
      chunks: [{ fileName: 'api.js', isEntry: true, code: '/* client */' }],
      css: 'c{}',
      importMap: '{}',
    };

    const bundleCode = async (map, opts) =>
      opts && opts.server ? serverBundle : clientBundle;

    const overrides = {
      bundleCode,
      createChunkedRequire: (chunks, req) => req,
      transform: ({ code }) => ({ code: Buffer.from(String(code)) }),
      toJs: () => ({ value: '/* generated */' }),
    };

    const { results, css } = await processJSXEntries(
      entries,
      template,
      astBuilders,
      fakeRequire,
      { version: { version: '1.0.0' }, overrides }
    );

    assert.equal(results.length, 1);
    const html = results[0].html.toString();
    assert.match(html, /<div>server<\/div>/);
    assert.match(html, /My API/);
    assert.ok(String(css).includes('s{}') || String(css).includes('c{}'));
  });
});
