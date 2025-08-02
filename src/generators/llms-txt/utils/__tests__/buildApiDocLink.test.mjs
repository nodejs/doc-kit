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
      api_doc_source: 'doc/api/test.md',
      llm_description: 'Test description',
    };

    const result = buildApiDocLink(entry);
    assert.ok(result.includes('[Test API]'));
    assert.ok(result.includes('/docs/latest/api/test.md'));
    assert.ok(result.includes('Test description'));
  });

  it('handles doc path replacement', () => {
    const entry = {
      heading: { data: { name: 'API Method' } },
      api_doc_source: 'doc/some/path.md',
      content: { children: [] },
    };

    const result = buildApiDocLink(entry);
    assert.ok(result.includes('/docs/latest/some/path.md'));
  });
});
