import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { isPage, withoutFragment } from '../router.mjs';

const root = 'https://nodejs.org/docs/latest/api/';

describe('isPage', () => {
  it('accepts the HTML pages under the site root', () => {
    for (const page of [
      'fs.html',
      'fs/promises.html',
      'fs.html?view=all#fs_readfile',
      '',
    ]) {
      assert.ok(isPage(new URL(page, root), root), page);
    }
  });

  it('accepts extensionless pages, as hosts with clean URLs serve them', () => {
    assert.ok(isPage(new URL('fs', root), root));
    assert.ok(isPage(new URL('fs/', root), root));
  });

  it("rejects the site's other files", () => {
    for (const file of ['fs.json', 'fs.md', 'orama-db.json', 'llms.txt']) {
      assert.ok(!isPage(new URL(file, root), root), file);
    }
  });

  it('rejects pages outside the site root', () => {
    for (const page of [
      'https://nodejs.org/learn/getting-started',
      'https://nodejs.org/docs/latest-v22.x/api/fs.html',
      'https://nodejs.org/docs/latest/api',
      'https://example.com/docs/latest/api/fs.html',
    ]) {
      assert.ok(!isPage(new URL(page), root), page);
    }
  });
});

describe('withoutFragment', () => {
  it('strips the fragment and keeps the query', () => {
    assert.strictEqual(
      withoutFragment(`${root}fs.html?view=all#fs_readfile`),
      `${root}fs.html?view=all`
    );
  });

  it('leaves a URL without a fragment unchanged', () => {
    assert.strictEqual(withoutFragment(`${root}fs.html`), `${root}fs.html`);
  });
});
