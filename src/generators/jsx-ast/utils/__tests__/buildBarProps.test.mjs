import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';

import semver from 'semver';

mock.module('reading-time', {
  defaultExport: () => ({ text: '5 min read' }),
});

mock.module('../../../../utils/generators.mjs', {
  namedExports: {
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
    assert.equal(result.readingTime, '5 min read');
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
      { version: '16.0.0', isLts: true, isCurrent: false },
      { version: '17.0.0', isLts: false, isCurrent: true },
      { version: '18.0.0', isLts: false, isCurrent: false },
    ];

    const api = 'http';

    const result = formatVersionOptions(versions, api);

    assert.equal(result.length, 3);
    assert.deepEqual(result[0], {
      value: '/api/16/http',
      label: 'v16 (LTS)',
    });

    assert.deepEqual(result[1], {
      value: '/api/17/http',
      label: 'v17 (Current)',
    });

    assert.deepEqual(result[2], {
      value: '/api/18/http',
      label: 'v18',
    });
  });
});

describe('buildSideBarProps', () => {
  it('creates sidebar properties with versions and navigation', () => {
    const entry = {
      api: 'http',
      introduced_in: 'v0.10.0',
    };

    const releases = [
      { version: '16.0.0', isLts: true, isCurrent: false },
      { version: '17.0.0', isLts: false, isCurrent: true },
    ];

    const version = new semver.SemVer('17.0.0');

    const docPages = [
      ['HTTP', 'http.html'],
      ['HTTPS', 'https.html'],
    ];

    const result = buildSideBarProps(entry, releases, version, docPages);

    assert.equal(result.currentVersion, 'v17.0.0');
    assert.equal(result.pathname, 'http.html');
    assert.deepEqual(result.docPages, docPages);
    assert.equal(result.versions.length, 2);
    assert.equal(result.versions[0].label, 'v18 (LTS)');
    assert.equal(result.versions[1].label, 'v19 (Current)');
  });
});
