import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildApiDocURL } from '../url.mjs';

const BASE = 'https://nodejs.org/';

describe('buildApiDocURL', () => {
  it('builds markdown doc URLs from doc/ sources', () => {
    const entry = { api_doc_source: 'doc/api/fs.md' };

    const result = buildApiDocURL(entry);

    assert.equal(result.href, `${BASE}docs/latest/api/fs.md`);
  });

  it('builds html doc URLs when requested', () => {
    const entry = { api_doc_source: 'doc/api/path.md' };

    const result = buildApiDocURL(entry, true);

    assert.equal(result.href, `${BASE}docs/latest/api/path.html`);
  });

  it('leaves non doc/ sources untouched', () => {
    const entry = { api_doc_source: 'api/crypto.md' };

    const result = buildApiDocURL(entry);

    assert.equal(result.href, `${BASE}api/crypto.md`);
  });
});
