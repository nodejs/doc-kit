import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { getEntryDescription, buildApiDocLink } from '../buildApiDocLink.mjs';

describe('getEntryDescription', () => {
  it('returns llm_description when available', () => {
    const entry = {
      llm_description: 'LLM generated description',
      content: { children: [] },
    };

    const result = getEntryDescription(entry);
    assert.equal(result, 'LLM generated description');
  });

  it('extracts first paragraph when no llm_description', () => {
    const entry = {
      content: {
        children: [
          {
            type: 'paragraph',
            children: [{ type: 'text', value: 'First paragraph' }],
          },
        ],
      },
    };

    const result = getEntryDescription(entry);
    assert.ok(result.length > 0);
  });

  it('returns empty string when no paragraph found', () => {
    const entry = {
      content: {
        children: [
          { type: 'heading', children: [{ type: 'text', value: 'Title' }] },
        ],
      },
    };

    const result = getEntryDescription(entry);
    assert.equal(result, '');
  });

  it('removes newlines from description', () => {
    const entry = {
      content: {
        children: [
          {
            type: 'paragraph',
            children: [{ type: 'text', value: 'Line 1\nLine 2\r\nLine 3' }],
          },
        ],
      },
    };

    const result = getEntryDescription(entry);
    assert.equal(result.includes('\n'), false);
    assert.equal(result.includes('\r'), false);
  });
});

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
