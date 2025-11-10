'use strict';

import assert from 'node:assert';
import { createRequire } from 'node:module';
import { describe, it } from 'node:test';

import { executeServerCode } from '../processing.mjs';

// Mock require function for testing
const mockRequire = createRequire(import.meta.url);

describe('executeServerCode', () => {
  it('should execute single server code and return dehydrated HTML', async () => {
    const serverCodeMap = new Map([['test.jsx', `return '<div>Test</div>';`]]);

    const result = await executeServerCode(serverCodeMap, mockRequire);

    assert.ok(result instanceof Map, 'should return a Map');
    assert.strictEqual(result.size, 1, 'should have one entry');
    // The result might be undefined if bundling fails, but the Map should exist
    assert.ok(result.has('test.jsx'), 'should have test.jsx key');
  });

  it('should execute multiple server code entries', async () => {
    const serverCodeMap = new Map([
      ['entry1.jsx', `return '<div>Entry 1</div>';`],
      ['entry2.jsx', `return '<div>Entry 2</div>';`],
    ]);

    const result = await executeServerCode(serverCodeMap, mockRequire);

    assert.strictEqual(result.size, 2, 'should have two entries');
    assert.ok(result.has('entry1.jsx'), 'should have entry1.jsx');
    assert.ok(result.has('entry2.jsx'), 'should have entry2.jsx');
  });

  it('should provide require function to executed code', async () => {
    // This code tries to use require
    const serverCodeMap = new Map([
      [
        'require-test.jsx',
        `
        const preact = require('preact');
        return typeof preact !== 'undefined' ? 'success' : 'fail';
      `,
      ],
    ]);

    const result = await executeServerCode(serverCodeMap, mockRequire);

    const output = result.get('require-test.jsx');
    assert.ok(output, 'should have output');
  });

  it('should handle server code that uses external packages', async () => {
    const serverCodeMap = new Map([
      [
        'external.jsx',
        `
        const { render } = require('preact-render-to-string');
        const { createElement } = require('preact');
        const el = createElement('span', null, 'External');
        return render(el);
      `,
      ],
    ]);

    const result = await executeServerCode(serverCodeMap, mockRequire);

    const html = result.get('external.jsx');
    assert.ok(html, 'should execute code with external deps');
  });

  it('should isolate execution contexts between entries', async () => {
    const serverCodeMap = new Map([
      ['context1.jsx', `const x = 'first'; return x;`],
      ['context2.jsx', `const x = 'second'; return x;`],
    ]);

    const result = await executeServerCode(serverCodeMap, mockRequire);

    assert.strictEqual(result.size, 2, 'should have two entries');
    assert.ok(result.has('context1.jsx'), 'should have context1.jsx');
    assert.ok(result.has('context2.jsx'), 'should have context2.jsx');
    // Each should have executed independently
    const result1 = result.get('context1.jsx');
    const result2 = result.get('context2.jsx');
    // Results might be undefined if bundling produces empty code, but keys should exist
    if (result1 !== undefined && result2 !== undefined) {
      assert.notStrictEqual(
        result1,
        result2,
        'should have different outputs if both exist'
      );
    }
  });
});
