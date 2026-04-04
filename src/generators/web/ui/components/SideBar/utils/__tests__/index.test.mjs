import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

const {
  buildSideBarGroups,
  getSidebarItems,
  getMajorVersion,
  getCompatibleVersions,
} = await import('../index.mjs');

const pages = [
  [1, { heading: 'File System API', path: 'fs', category: 'File System' }],
  [2, { heading: 'HTTP API', path: 'http', category: 'Networking' }],
  [3, { heading: 'Path API', path: 'path', category: 'File System' }],
  [-1, { heading: 'Index', path: 'index' }],
];

const versions = [
  { major: 14, url: '/api/v14/{path}.html', label: 'v14' },
  { major: 16, url: '/api/v16/{path}.html', label: 'v16' },
  { major: 18, url: '/api/v18/{path}.html', label: 'v18' },
];

describe('buildSideBarGroups', () => {
  it('groups entries by category and preserves insertion order', () => {
    const metadata = { path: 'fs', basename: 'fs' };

    const result = buildSideBarGroups(pages, metadata);

    assert.deepStrictEqual(result, [
      {
        groupName: 'File System',
        items: [
          { label: 'File System API', link: 'fs.html' },
          { label: 'Path API', link: 'path.html' },
        ],
      },
      {
        groupName: 'Networking',
        items: [{ label: 'HTTP API', link: 'http.html' }],
      },
    ]);
  });

  it('puts entries without category into an Others group at the end by default', () => {
    const uncategorizedPages = [
      [1, { heading: 'Buffer', path: 'buffer', category: 'Binary' }],
      [-1, { heading: 'Unknown', path: 'unknown' }],
      [-1, { heading: 'Config', path: 'config', category: '' }],
    ];
    const metadata = { path: 'buffer', basename: 'buffer' };

    const result = buildSideBarGroups(uncategorizedPages, metadata);

    assert.equal(result.at(-1).groupName, 'Others');
    assert.deepStrictEqual(result.at(-1).items, [
      { label: 'Unknown', link: 'unknown.html' },
      { label: 'Config', link: 'config.html' },
    ]);
  });

  it('uses a custom default group name when provided', () => {
    const metadata = { path: 'unknown', basename: 'unknown' };
    const result = buildSideBarGroups(
      [[-1, { heading: 'Unknown', path: 'unknown' }]],
      metadata,
      'General'
    );

    assert.deepStrictEqual(result, [
      {
        groupName: 'General',
        items: [{ label: 'Unknown', link: 'unknown.html' }],
      },
    ]);
  });

  it('returns an empty array when given no entries', () => {
    assert.deepStrictEqual(
      buildSideBarGroups([], { path: 'fs', basename: 'fs' }),
      []
    );
  });
});

describe('getSidebarItems', () => {
  it('maps pages to sidebar items and keeps category values', () => {
    const metadata = { path: 'fs', basename: 'fs' };
    const result = getSidebarItems(pages.slice(0, 3), metadata);

    assert.deepStrictEqual(result, [
      {
        label: 'File System API',
        link: 'fs.html',
        category: 'File System',
      },
      {
        label: 'HTTP API',
        link: 'http.html',
        category: 'Networking',
      },
      {
        label: 'Path API',
        link: 'path.html',
        category: 'File System',
      },
    ]);
  });

  it('uses basename html for the current page and relative links for others', () => {
    const metadata = { path: 'guide/fs', basename: 'fs' };
    const result = getSidebarItems(
      [
        [
          1,
          {
            heading: 'File System API',
            path: 'guide/fs',
            category: 'File System',
          },
        ],
        [
          2,
          { heading: 'HTTP API', path: 'guide/http', category: 'Networking' },
        ],
        [-1, { heading: 'Child API', path: 'guide/sub/child' }],
      ],
      metadata
    );

    assert.deepStrictEqual(result, [
      {
        label: 'File System API',
        link: 'fs.html',
        category: 'File System',
      },
      {
        label: 'HTTP API',
        link: 'http.html',
        category: 'Networking',
      },
      {
        label: 'Child API',
        link: 'sub/child.html',
        category: undefined,
      },
    ]);
  });

  it('maps the new [weight, page] tuple shape', () => {
    const metadata = { path: 'guide/fs', basename: 'fs' };
    const result = getSidebarItems(
      [
        [
          10,
          {
            heading: 'File System API',
            path: 'guide/fs',
            category: 'File System',
          },
        ],
        [
          20,
          { heading: 'HTTP API', path: 'guide/http', category: 'Networking' },
        ],
        [-1, { heading: 'Child API', path: 'guide/sub/child' }],
      ],
      metadata
    );

    assert.deepStrictEqual(result, [
      {
        label: 'File System API',
        link: 'fs.html',
        category: 'File System',
      },
      {
        label: 'HTTP API',
        link: 'http.html',
        category: 'Networking',
      },
      {
        label: 'Child API',
        link: 'sub/child.html',
        category: undefined,
      },
    ]);
  });
});

describe('getMajorVersion', () => {
  it('extracts major version from "v" prefixed string', () => {
    assert.strictEqual(getMajorVersion('v14.0.0'), 14);
    assert.strictEqual(getMajorVersion('v18.12.0'), 18);
  });

  it('extracts major version without "v" prefix', () => {
    assert.strictEqual(getMajorVersion('16.0.0'), 16);
    assert.strictEqual(getMajorVersion('20.1.0'), 20);
  });

  it('handles single digit versions', () => {
    assert.strictEqual(getMajorVersion('v4'), 4);
    assert.strictEqual(getMajorVersion('9'), 9);
  });

  it('returns integer only', () => {
    const result = getMajorVersion('v14.5.3');
    assert.strictEqual(typeof result, 'number');
    assert.strictEqual(result % 1, 0);
  });
});

describe('getCompatibleVersions', () => {
  it('includes versions with equal or greater major version', () => {
    const metadata = { added: 'v14.0.0', path: 'fs.md' };
    const result = getCompatibleVersions(versions, metadata);

    assert.deepStrictEqual(result, [
      { value: '/api/v14/fs.md.html', label: 'v14' },
      { value: '/api/v16/fs.md.html', label: 'v16' },
      { value: '/api/v18/fs.md.html', label: 'v18' },
    ]);
  });

  it('filters out versions with lower major version', () => {
    const metadata = { added: 'v18.0.0', path: 'fs.md' };
    const result = getCompatibleVersions(versions, metadata);

    assert.deepStrictEqual(result, [
      { value: '/api/v18/fs.md.html', label: 'v18' },
    ]);
  });

  it('uses introduced_in as fallback when added is missing', () => {
    const metadata = { introduced_in: 'v16.0.0', path: 'fs.md' };
    const result = getCompatibleVersions(versions, metadata);

    assert.deepStrictEqual(result, [
      { value: '/api/v16/fs.md.html', label: 'v16' },
      { value: '/api/v18/fs.md.html', label: 'v18' },
    ]);
  });

  it('defaults to v0 when no version info provided', () => {
    const metadata = { path: 'fs.md' };
    const result = getCompatibleVersions(versions, metadata);

    assert.deepStrictEqual(result, [
      { value: '/api/v14/fs.md.html', label: 'v14' },
      { value: '/api/v16/fs.md.html', label: 'v16' },
      { value: '/api/v18/fs.md.html', label: 'v18' },
    ]);
  });

  it('replaces {path} placeholder in URL', () => {
    const metadata = { added: 'v14.0.0', path: 'file/system' };
    const result = getCompatibleVersions(versions, metadata);

    result.forEach(item => {
      assert.ok(!item.value.includes('{path}'));
      assert.ok(item.value.includes(metadata.path));
    });
  });
});
