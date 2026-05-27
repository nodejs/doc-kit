import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  default as getConfig,
  setConfig,
} from '../../../../utils/configuration/index.mjs';
import { populateWithEvaluation, resolvePageRoot } from '../processing.mjs';

await setConfig({
  version: 'v22.0.0',
  changelog: [],
  generators: {
    web: {
      useAbsoluteURLs: false,
      baseURL: 'https://nodejs.org/docs',
    },
  },
});

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

describe('resolvePageRoot', () => {
  it('keeps relative roots for regular pages', () => {
    const result = resolvePageRoot({ path: '/api/fs' });
    assert.strictEqual(result, '../');
  });

  it('uses the server root for synthetic pages', () => {
    const result = resolvePageRoot({
      path: '/404',
      synthetic: true,
    });
    assert.strictEqual(result, '/');
  });

  it('uses the configured base URL for synthetic pages with absolute URLs', async () => {
    getConfig('web').useAbsoluteURLs = true;

    const result = resolvePageRoot({
      path: '/404',
      synthetic: true,
    });
    assert.strictEqual(result, 'https://nodejs.org/docs/');

    getConfig('web').useAbsoluteURLs = false;
  });
});
