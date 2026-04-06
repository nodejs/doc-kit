import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { populateWithEvaluation } from '../processing.mjs';

describe('populateWithEvaluation', () => {
  it('substitutes simple ${variable} placeholders', () => {
    const result = populateWithEvaluation('Hello ${name}!', { name: 'World' });
    assert.strictEqual(result, 'Hello World!');
  });

  it('supports multiple variables', () => {
    const result = populateWithEvaluation('${greeting} ${name}!', {
      greeting: 'Hi',
      name: 'Node',
    });
    assert.strictEqual(result, 'Hi Node!');
  });

  it('supports JavaScript expressions', () => {
    const result = populateWithEvaluation('${value > 5 ? "big" : "small"}', {
      value: 10,
    });
    assert.strictEqual(result, 'big');
  });

  it('supports ternary expressions for conditional content', () => {
    const result = populateWithEvaluation(
      '${showExtra ? "extra content" : ""}',
      { showExtra: false }
    );
    assert.strictEqual(result, '');
  });

  it('handles JSON.stringify for objects', () => {
    const obj = { key: 'value' };
    const result = populateWithEvaluation('${JSON.stringify(data)}', {
      data: obj,
    });
    assert.strictEqual(result, '{"key":"value"}');
  });

  it('preserves surrounding HTML content', () => {
    const result = populateWithEvaluation(
      '<title>${title}</title><link href="${root}styles.css" />',
      { title: 'Test Page', root: '../' }
    );
    assert.strictEqual(
      result,
      '<title>Test Page</title><link href="../styles.css" />'
    );
  });

  it('handles empty string values', () => {
    const result = populateWithEvaluation('[${content}]', { content: '' });
    assert.strictEqual(result, '[]');
  });

  it('handles numeric values', () => {
    const result = populateWithEvaluation('count: ${count}', { count: 42 });
    assert.strictEqual(result, 'count: 42');
  });
});
