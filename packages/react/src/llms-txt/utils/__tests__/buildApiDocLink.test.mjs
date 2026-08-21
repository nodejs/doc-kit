import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildApiDocLink } from '../buildApiDocLink.mjs';

describe('buildApiDocLink', () => {
  it('builds markdown link with description', () => {
    const entry = {
      heading: { data: { name: 'Test API' } },
      path: '/test',
      llm_description: 'Test description',
    };

    const config = {
      baseURL: 'https://example.com',
      pageURL: '{baseURL}/docs/latest/api{path}.md',
    };

    const result = buildApiDocLink(entry, config);
    assert.strictEqual(
      result,
      '[Test API](https://example.com/docs/latest/api/test.md): Test description'
    );
  });

  it('handles custom pageURL template', () => {
    const entry = {
      heading: { data: { name: 'API Method' } },
      path: '/path',
      content: { children: [] },
    };

    const config = {
      baseURL: 'https://example.com',
      pageURL: '{baseURL}/api{path}.md',
    };

    const result = buildApiDocLink(entry, config);
    assert.ok(result.includes('https://example.com/api/path.md'));
  });
});
