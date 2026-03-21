import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { generateSignature, getFullName } from '../signature.mjs';

describe('generateSignature', () => {
  describe('function signatures', () => {
    it('formats union return types without spaces as spaced', () => {
      const sig = generateSignature(
        'foo',
        {
          params: [],
          return: { type: 'string|number' },
        },
        ''
      );

      assert.strictEqual(sig, 'foo(): string | number');
    });

    it('preserves already spaced union return types', () => {
      const sig = generateSignature(
        'bar',
        {
          params: [],
          return: { type: 'Promise<string> | undefined' },
        },
        ''
      );

      assert.strictEqual(sig, 'bar(): Promise<string> | undefined');
    });

    it('omits return type when undefined', () => {
      const sig = generateSignature(
        'baz',
        {
          params: [],
          return: undefined,
        },
        ''
      );

      assert.strictEqual(sig, 'baz(): void');
    });

    it('handles empty return type', () => {
      const sig = generateSignature(
        'test',
        {
          params: [],
          return: null,
        },
        ''
      );

      assert.strictEqual(sig, 'test(): void');
    });

    it('includes prefix when provided', () => {
      const sig = generateSignature(
        'Constructor',
        {
          params: [],
          return: undefined,
        },
        'new '
      );

      assert.strictEqual(sig, 'new Constructor(): void');
    });

    it('handles complex union types with multiple pipes', () => {
      const sig = generateSignature(
        'complexFunc',
        {
          params: [],
          return: { type: 'string|number|boolean|null' },
        },
        ''
      );

      assert.strictEqual(
        sig,
        'complexFunc(): string | number | boolean | null'
      );
    });

    it('filters empty parts in union types', () => {
      const sig = generateSignature(
        'filterFunc',
        {
          params: [],
          return: { type: 'string||number|' },
        },
        ''
      );

      assert.strictEqual(sig, 'filterFunc(): string | number');
    });
  });

  describe('parameters', () => {
    it('handles single parameter without optional flag or default', () => {
      const sig = generateSignature(
        'singleParam',
        {
          params: [{ name: 'value', optional: false }],
          return: undefined,
        },
        ''
      );

      assert.strictEqual(sig, 'singleParam(value): void');
    });

    it('handles multiple parameters', () => {
      const sig = generateSignature(
        'multiParam',
        {
          params: [
            { name: 'first', optional: false },
            { name: 'second', optional: false },
          ],
          return: undefined,
        },
        ''
      );

      assert.strictEqual(sig, 'multiParam(first, second): void');
    });

    it('marks optional parameters with question mark', () => {
      const sig = generateSignature(
        'optionalParam',
        {
          params: [
            { name: 'required', optional: false },
            { name: 'optional', optional: true },
          ],
          return: undefined,
        },
        ''
      );

      assert.strictEqual(sig, 'optionalParam(required, optional?): void');
    });

    it('marks parameters with defaults as optional', () => {
      const sig = generateSignature(
        'defaultParam',
        {
          params: [
            { name: 'normal', optional: false },
            { name: 'withDefault', optional: false, default: 'defaultValue' },
          ],
          return: undefined,
        },
        ''
      );

      assert.strictEqual(sig, 'defaultParam(normal, withDefault?): void');
    });

    it('handles parameters that are both optional and have defaults', () => {
      const sig = generateSignature(
        'bothOptionalAndDefault',
        {
          params: [{ name: 'param', optional: true, default: 'value' }],
          return: undefined,
        },
        ''
      );

      assert.strictEqual(sig, 'bothOptionalAndDefault(param?): void');
    });

    it('handles empty params array', () => {
      const sig = generateSignature(
        'noParams',
        {
          params: [],
          return: { type: 'string' },
        },
        ''
      );

      assert.strictEqual(sig, 'noParams(): string');
    });

    it('handles params without optional property', () => {
      const sig = generateSignature(
        'implicitOptional',
        {
          params: [{ name: 'param1' }, { name: 'param2', default: 'value' }],
          return: undefined,
        },
        ''
      );

      assert.strictEqual(sig, 'implicitOptional(param1, param2?): void');
    });
  });

  describe('class signatures', () => {
    it('generates class signature with extends clause', () => {
      const sig = generateSignature(
        'MyClass',
        {
          params: [],
          extends: { type: 'BaseClass' },
        },
        ''
      );

      assert.strictEqual(sig, 'class MyClass extends BaseClass');
    });

    it('generates class signature with extends and prefix', () => {
      const sig = generateSignature(
        'MyClass',
        {
          params: [],
          extends: { type: 'BaseClass' },
        },
        'abstract '
      );

      assert.strictEqual(sig, 'class abstract MyClass extends BaseClass');
    });

    it('ignores params and return type for class with extends', () => {
      const sig = generateSignature(
        'MyClass',
        {
          params: [{ name: 'ignored', optional: false }],
          return: { type: 'ignored' },
          extends: { type: 'BaseClass' },
        },
        ''
      );

      assert.strictEqual(sig, 'class MyClass extends BaseClass');
    });

    it('generates function signature when no extends present', () => {
      const sig = generateSignature(
        'MyClass',
        {
          params: [{ name: 'param', optional: false }],
          return: { type: 'MyClass' },
        },
        'new '
      );

      assert.strictEqual(sig, 'new MyClass(param): MyClass');
    });
  });

  describe('edge cases', () => {
    it('handles null return type', () => {
      const sig = generateSignature(
        'nullReturn',
        {
          params: [],
          return: null,
        },
        ''
      );

      assert.strictEqual(sig, 'nullReturn(): void');
    });

    it('handles missing extends property', () => {
      const sig = generateSignature(
        'NoExtends',
        {
          params: [{ name: 'param' }],
          return: { type: 'void' },
        },
        ''
      );

      assert.strictEqual(sig, 'NoExtends(param): void');
    });
  });
});

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
});
