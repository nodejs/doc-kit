import { strictEqual } from 'node:assert';
import { describe, it } from 'node:test';

import { createContext } from './utils.mjs';
import { missingMetadata } from '../../rules/missing-metadata.mjs';

describe('missingMetadata', () => {
  it('should not report when both fields are present', () => {
    const context = createContext([
      { type: 'html', value: '<!--introduced_in=12.0.0-->' },
      { type: 'html', value: '<!--llm_description=desc-->' },
    ]);

    missingMetadata(context);
    strictEqual(context.report.mock.callCount(), 0);
  });

  it('should report only llm_description when introduced_in is present', () => {
    const context = createContext([
      { type: 'html', value: '<!--introduced_in=12.0.0-->' },
    ]);

    missingMetadata(context);
    strictEqual(context.report.mock.callCount(), 1);
    strictEqual(context.report.mock.calls[0].arguments[0].level, 'warn');
  });

  it('should not report llm_description when paragraph fallback exists', () => {
    const context = createContext([
      { type: 'html', value: '<!--introduced_in=12.0.0-->' },
      { type: 'paragraph', children: [{ type: 'text', value: 'desc' }] },
    ]);

    missingMetadata(context);
    strictEqual(context.report.mock.callCount(), 0);
  });

  it('should report both when nothing is present', () => {
    const context = createContext([{ type: 'heading', depth: 1 }]);

    missingMetadata(context);
    strictEqual(context.report.mock.callCount(), 2);
  });

  it('should report only introduced_in when llm_description is present', () => {
    const context = createContext([
      { type: 'html', value: '<!--llm_description=desc-->' },
    ]);

    missingMetadata(context);
    strictEqual(context.report.mock.callCount(), 1);
    strictEqual(context.report.mock.calls[0].arguments[0].level, 'info');
  });
});
