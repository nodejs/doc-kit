import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { getFullName } from '../getFullName.mjs';

describe('getFullName', () => {
  it('returns fallback when name equals text', () => {
    const result = getFullName({ name: 'test', text: 'test' }, 'fallback');
    assert.strictEqual(result, 'fallback');
  });

  it('returns name as fallback when name equals text and no fallback provided', () => {
    const result = getFullName({ name: 'test', text: 'test' });
    assert.strictEqual(result, 'test');
  });

  it('extracts inline code that includes the name', () => {
    const result = getFullName({
      name: 'myFunc',
      text: 'This is `myFunc(param1, param2)` function',
    });
    assert.strictEqual(result, 'myFunc');
  });

  it('handles inline code with extra content after name', () => {
    const result = getFullName({
      name: 'authenticate',
      text: 'The `authenticate(user, password)` method',
    });
    assert.strictEqual(result, 'authenticate');
  });

  it('strips quotes from the beginning', () => {
    const result = getFullName({
      name: 'func',
      text: 'The `"func"()` method',
    });
    assert.strictEqual(result, 'func');
  });

  it('strips single quotes from the beginning', () => {
    const result = getFullName({
      name: 'func',
      text: "The `'func'()` method",
    });
    assert.strictEqual(result, 'func');
  });

  it('strips "new" keyword from the beginning', () => {
    const result = getFullName({
      name: 'Constructor',
      text: 'The `new Constructor()` call',
    });
    assert.strictEqual(result, 'Constructor');
  });

  it('strips "new " with space from the beginning', () => {
    const result = getFullName({
      name: 'MyClass',
      text: 'The `new MyClass(param)` constructor',
    });
    assert.strictEqual(result, 'MyClass');
  });

  it('returns fallback when no inline code found', () => {
    const result = getFullName(
      {
        name: 'func',
        text: 'This is a function without code blocks',
      },
      'fallback'
    );
    assert.strictEqual(result, 'fallback');
  });

  it('returns fallback when inline code does not include name', () => {
    const result = getFullName(
      {
        name: 'myFunc',
        text: 'This is `otherFunc()` function',
      },
      'fallback'
    );
    assert.strictEqual(result, 'fallback');
  });

  it('handles empty inline code', () => {
    const result = getFullName(
      {
        name: 'func',
        text: 'This has `` empty code',
      },
      'fallback'
    );
    assert.strictEqual(result, 'fallback');
  });

  it('handles multiple inline code blocks, uses first match', () => {
    const result = getFullName({
      name: 'func',
      text: 'This has `func()` and `other()` code',
    });
    assert.strictEqual(result, 'func');
  });

  it('handles complex inline code with parameters', () => {
    const result = getFullName({
      name: 'processData',
      text: 'The `processData(input, options = {})` method processes data',
    });
    assert.strictEqual(result, 'processData');
  });

  it('strips both quotes and new keyword', () => {
    const result = getFullName({
      name: 'MyClass',
      text: '`"new MyClass"()`',
    });
    assert.strictEqual(result, 'MyClass');
  });

  it('handles text with no backticks', () => {
    const result = getFullName(
      {
        name: 'func',
        text: 'This function does something',
      },
      'fallbackValue'
    );
    assert.strictEqual(result, 'fallbackValue');
  });

  it('skips occurrences of the name within the receiver', () => {
    const result = getFullName({
      name: 'channel',
      text: '`diagnostics_channel.channel(name)`',
    });
    assert.strictEqual(result, 'diagnostics_channel.channel');
  });

  it('skips occurrences of the name that are a prefix of the receiver', () => {
    const result = getFullName({
      name: 'read',
      text: '`readable.read([size])`',
    });
    assert.strictEqual(result, 'readable.read');
  });

  it('ignores parameters repeating the name', () => {
    const result = getFullName({
      name: 'percentile',
      text: '`histogram.percentile(percentile)`',
    });
    assert.strictEqual(result, 'histogram.percentile');
  });

  it('handles symbol-keyed methods', () => {
    const result = getFullName({
      name: "[Symbol.for('nodejs.rejection')]",
      text: "`emitter[Symbol.for('nodejs.rejection')](err, eventName[, ...args])`",
    });
    assert.strictEqual(result, "emitter[Symbol.for('nodejs.rejection')]");
  });

  it('keeps quoted names intact', () => {
    const result = getFullName({
      name: 'console.log',
      text: "Event: `'console.log'`",
    });
    assert.strictEqual(result, 'console.log');
  });

  it('does not strip "new" from within a name', () => {
    const result = getFullName({
      name: 'newListener',
      text: "Event: `'newListener'`",
    });
    assert.strictEqual(result, 'newListener');
  });

  it('does not strip "new" from within a dotted name', () => {
    const result = getFullName({
      name: 'onnewtoken',
      text: '`session.onnewtoken`',
    });
    assert.strictEqual(result, 'session.onnewtoken');
  });

  it('returns fallback when no occurrence terminates the name', () => {
    const result = getFullName(
      {
        name: 'read',
        text: '`readable`',
      },
      'fallback'
    );
    assert.strictEqual(result, 'fallback');
  });
});
