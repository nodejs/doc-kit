import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';

import { SemVer } from 'semver';

import { setConfig } from '../../../../utils/configuration/index.mjs';
import * as generatorsExports from '../../../../utils/generators.mjs';

mock.module('reading-time', {
  defaultExport: () => ({ text: '5 min read' }),
});

mock.module('../../../../utils/generators.mjs', {
  namedExports: {
    ...generatorsExports,
    getCompatibleVersions: () => [
      { version: '18.0.0', isLts: true, isCurrent: false },
      { version: '19.0.0', isLts: false, isCurrent: true },
    ],
    leftHandAssign: Object.assign,
    getVersionFromSemVer: version => version.split('.')[0],
    getVersionURL: (version, api) => `/api/${version}/${api}`,
  },
});

const {
  extractTextContent,
  buildMetaBarProps,
  formatVersionOptions,
  buildSideBarProps,
} = await import('../buildBarProps.mjs');

await setConfig({
  version: 'v17.0.0',
  changelog: [
    { version: new SemVer('16.0.0'), isLts: true, isCurrent: false },
    { version: new SemVer('17.0.0'), isLts: false, isCurrent: true },
  ],
});

describe('extractTextContent', () => {
  it('combines text and code node values from entries', () => {
    const entries = [
      {
        content: {
          type: 'root',
          children: [
            { type: 'text', value: 'Hello ' },
            { type: 'code', value: 'world' },
          ],
        },
      },
      {
        content: {
          type: 'root',
          children: [
            { type: 'text', value: 'Another ' },
            { type: 'code', value: 'example' },
          ],
        },
      },
    ];

    const result = extractTextContent(entries);
    assert.equal(result, 'Hello worldAnother example');
  });
});

describe('buildMetaBarProps', () => {
  it('creates meta bar properties from entries', () => {
    const head = {
      api: 'fs',
      added_in: 'v1.0.0',
    };

    const entries = [
      {
        content: {
          type: 'root',
          children: [{ type: 'text', value: 'Content' }],
        },
        heading: {
          depth: 2,
          data: {
            text: 'Heading',
            name: 'Heading',
            slug: 'heading',
            depth: 2,
          },
        },
      },
    ];

    const result = buildMetaBarProps(head, entries);

    assert.equal(result.addedIn, 'v1.0.0');
    assert.equal(result.readingTime, '1 min read');
    assert.deepEqual(result.viewAs, [
      ['JSON', 'fs.json'],
      ['MD', 'fs.md'],
    ]);
    assert.equal(
      result.editThisPage,
      'https://github.com/nodejs/node/edit/main/doc/api/fs.md'
    );
    assert.ok(Array.isArray(result.headings));
  });

  it('falls back to introduced_in if added_in is missing', () => {
    const head = {
      api: 'fs',
      introduced_in: 'v2.0.0',
    };

    const entries = [];

    const result = buildMetaBarProps(head, entries);
    assert.equal(result.addedIn, 'v2.0.0');
  });
});

describe('formatVersionOptions', () => {
  it('formats version options with proper labels', () => {
    const versions = [
      { version: new SemVer('16.0.0'), isLts: true, isCurrent: false },
      { version: new SemVer('17.0.0'), isLts: false, isCurrent: true },
      { version: new SemVer('18.0.0'), isLts: false, isCurrent: false },
    ];

    const api = 'http';

    const result = formatVersionOptions(versions, api);

    assert.deepStrictEqual(result, [
      {
        label: 'v16.x (LTS)',
        value: 'https://nodejs.org/docs/latest-v16.x/api/http.html',
      },
      {
        label: 'v17.x (Current)',
        value: 'https://nodejs.org/docs/latest-v17.x/api/http.html',
      },
      {
        label: 'v18.x',
        value: 'https://nodejs.org/docs/latest-v18.x/api/http.html',
      },
    ]);
  });
});

describe('buildSideBarProps', () => {
  it('creates sidebar properties with versions and navigation', () => {
    const entry = {
      api: 'http',
      introduced_in: 'v0.10.0',
    };

    const docPages = [
      ['HTTP', 'http.html'],
      ['HTTPS', 'https.html'],
    ];

    const result = buildSideBarProps(entry, docPages);

    assert.equal(result.currentVersion, 'v17.0.0');
    assert.equal(result.pathname, 'http.html');
    assert.deepEqual(result.docPages, docPages);
  });
});
