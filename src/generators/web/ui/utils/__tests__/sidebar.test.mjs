'use strict';

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildSideBarGroups } from '../sidebar.mjs';

describe('buildSideBarGroups', () => {
  it('groups entries by category and preserves insertion order', () => {
    const frontmatter = [
      { label: 'FS', link: '/api/fs.html', category: 'File System' },
      { label: 'HTTP', link: '/api/http.html', category: 'Networking' },
      { label: 'Path', link: '/api/path.html', category: 'File System' },
    ];

    const result = buildSideBarGroups(frontmatter);

    assert.deepStrictEqual(result, [
      {
        groupName: 'File System',
        items: [
          { label: 'FS', link: '/api/fs.html' },
          { label: 'Path', link: '/api/path.html' },
        ],
      },
      {
        groupName: 'Networking',
        items: [{ label: 'HTTP', link: '/api/http.html' }],
      },
    ]);
  });

  it('puts entries without category into an Others group at the end by default', () => {
    const frontmatter = [
      { label: 'Buffer', link: '/api/buffer.html', category: 'Binary' },
      { label: 'Unknown', link: '/api/unknown.html' },
      { label: 'Config', link: '/api/config.html', category: '' },
    ];

    const result = buildSideBarGroups(frontmatter);

    assert.equal(result.at(-1).groupName, 'Others');
    assert.deepStrictEqual(result.at(-1).items, [
      { label: 'Unknown', link: '/api/unknown.html' },
      { label: 'Config', link: '/api/config.html' },
    ]);
  });

  it('uses a custom default group name when provided', () => {
    const result = buildSideBarGroups(
      [{ label: 'Unknown', link: '/api/unknown.html' }],
      'General'
    );

    assert.deepStrictEqual(result, [
      {
        groupName: 'General',
        items: [{ label: 'Unknown', link: '/api/unknown.html' }],
      },
    ]);
  });

  it('returns an empty array when given no entries', () => {
    assert.deepStrictEqual(buildSideBarGroups([]), []);
  });
});
