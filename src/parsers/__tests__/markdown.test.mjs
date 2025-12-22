import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';

import dedent from 'dedent';
import { SemVer } from 'semver';

let content;
mock.module('../../utils/parser.mjs', {
  namedExports: {
    loadFromURL: async () => content,
  },
});

const { parseChangelog, parseIndex } = await import('../markdown.mjs');

describe('parseChangelog', () => {
  it('should parse Node.js versions and their LTS status', async () => {
    content = dedent`
    * [Node.js 24](doc/changelogs/CHANGELOG_V24.md) **Current**
    * [Node.js 22](doc/changelogs/CHANGELOG_V22.md) **Long Term Support**\n
    `;

    const results = await parseChangelog('...');

    assert.deepStrictEqual(results, [
      { version: new SemVer('24.0.0'), isLts: false },
      { version: new SemVer('22.0.0'), isLts: true },
    ]);
  });
});

describe('parseIndex', () => {
  it('should retrieve document titles for sidebar generation', async () => {
    content = dedent`
      # API Documentation

      * [Assert](assert.md)
      * [Buffer](buffer.md)
      * [Child Process](child_process.md)
      * [Something](not-a-markdown-file)
    `;

    const results = await parseIndex('...');

    assert.deepStrictEqual(results, [
      { section: 'Assert', api: 'assert' },
      { section: 'Buffer', api: 'buffer' },
      { section: 'Child Process', api: 'child_process' },
    ]);
  });
});
