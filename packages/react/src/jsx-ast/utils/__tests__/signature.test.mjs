import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { loadMarkdownPlugins } from '@doc-kit/core/utils/markdown/plugins.mjs';

import { createSignatureCodeBlock, generateSignature } from '../signature.mjs';

describe('generateSignature', () => {
  describe('function signatures', () => {
    it('formats union return types without spaces as spaced', () => {
      const sig = generateSignature('foo', {
        params: [],
        return: { type: 'string|number' },
      });

      assert.strictEqual(sig, 'foo(): string | number');
    });

    it('preserves already spaced union return types', () => {
      const sig = generateSignature('bar', {
        params: [],
        return: { type: 'Promise<string> | undefined' },
      });

      assert.strictEqual(sig, 'bar(): Promise<string> | undefined');
    });

    it('omits return type when undefined', () => {
      const sig = generateSignature('baz', {
        params: [],
        return: undefined,
      });

      assert.strictEqual(sig, 'baz(): void');
    });

    it('handles empty return type', () => {
      const sig = generateSignature('test', {
        params: [],
        return: null,
      });

      assert.strictEqual(sig, 'test(): void');
    });

    it('prefixes a constructor and infers its return type', () => {
      const sig = generateSignature(
        'Constructor',
        {
          params: [],
          return: undefined,
        },
        { type: 'ctor' }
      );

      // Node's docs omit `Returns:` on constructors, but a constructor never
      // returns `void` — it yields an instance of its own class.
      assert.strictEqual(sig, 'new Constructor(): Constructor');
    });

    it('keeps an explicit return type on a constructor', () => {
      const sig = generateSignature(
        'Constructor',
        {
          params: [],
          return: { type: 'net.Socket' },
        },
        { type: 'ctor' }
      );

      assert.strictEqual(sig, 'new Constructor(): net.Socket');
    });

    it('falls back when a return entry carries no type', () => {
      const sig = generateSignature(
        'noType',
        {
          params: [],
          return: { type: undefined },
        },
        { type: 'method' }
      );

      assert.strictEqual(sig, 'noType(): void');
    });

    it('handles complex union types with multiple pipes', () => {
      const sig = generateSignature('complexFunc', {
        params: [],
        return: { type: 'string|number|boolean|null' },
      });

      assert.strictEqual(
        sig,
        'complexFunc(): string | number | boolean | null'
      );
    });

    it('filters empty parts in union types', () => {
      const sig = generateSignature('filterFunc', {
        params: [],
        return: { type: 'string||number|' },
      });

      assert.strictEqual(sig, 'filterFunc(): string | number');
    });
  });

  describe('parameters', () => {
    it('handles single parameter without optional flag or default', () => {
      const sig = generateSignature('singleParam', {
        params: [{ name: 'value', optional: false }],
        return: undefined,
      });

      assert.strictEqual(sig, 'singleParam(value): void');
    });

    it('handles multiple parameters', () => {
      const sig = generateSignature('multiParam', {
        params: [
          { name: 'first', optional: false },
          { name: 'second', optional: false },
        ],
        return: undefined,
      });

      assert.strictEqual(sig, 'multiParam(first, second): void');
    });

    it('marks optional parameters with question mark', () => {
      const sig = generateSignature('optionalParam', {
        params: [
          { name: 'required', optional: false },
          { name: 'optional', optional: true },
        ],
        return: undefined,
      });

      assert.strictEqual(sig, 'optionalParam(required, optional?): void');
    });

    it('marks parameters with defaults as optional', () => {
      const sig = generateSignature('defaultParam', {
        params: [
          { name: 'normal', optional: false },
          { name: 'withDefault', optional: false, default: 'defaultValue' },
        ],
        return: undefined,
      });

      assert.strictEqual(sig, 'defaultParam(normal, withDefault?): void');
    });

    it('handles parameters that are both optional and have defaults', () => {
      const sig = generateSignature('bothOptionalAndDefault', {
        params: [{ name: 'param', optional: true, default: 'value' }],
        return: undefined,
      });

      assert.strictEqual(sig, 'bothOptionalAndDefault(param?): void');
    });

    it('handles empty params array', () => {
      const sig = generateSignature('noParams', {
        params: [],
        return: { type: 'string' },
      });

      assert.strictEqual(sig, 'noParams(): string');
    });

    it('handles params without optional property', () => {
      const sig = generateSignature('implicitOptional', {
        params: [{ name: 'param1' }, { name: 'param2', default: 'value' }],
        return: undefined,
      });

      assert.strictEqual(sig, 'implicitOptional(param1, param2?): void');
    });
  });

  describe('class signatures', () => {
    it('generates class signature with extends clause', () => {
      const sig = generateSignature('MyClass', {
        params: [],
        extends: { type: 'BaseClass' },
      });

      assert.strictEqual(sig, 'class MyClass extends BaseClass');
    });

    it('does not prefix a class signature', () => {
      const sig = generateSignature(
        'MyClass',
        {
          params: [],
          extends: { type: 'BaseClass' },
        },
        { type: 'class' }
      );

      assert.strictEqual(sig, 'class MyClass extends BaseClass');
    });

    it('ignores params and return type for class with extends', () => {
      const sig = generateSignature('MyClass', {
        params: [{ name: 'ignored', optional: false }],
        return: { type: 'ignored' },
        extends: { type: 'BaseClass' },
      });

      assert.strictEqual(sig, 'class MyClass extends BaseClass');
    });

    it('generates function signature when no extends present', () => {
      const sig = generateSignature(
        'MyClass',
        {
          params: [{ name: 'param', optional: false }],
          return: { type: 'MyClass' },
        },
        { type: 'ctor' }
      );

      assert.strictEqual(sig, 'new MyClass(param): MyClass');
    });
  });

  describe('edge cases', () => {
    it('handles null return type', () => {
      const sig = generateSignature('nullReturn', {
        params: [],
        return: null,
      });

      assert.strictEqual(sig, 'nullReturn(): void');
    });

    it('handles missing extends property', () => {
      const sig = generateSignature('NoExtends', {
        params: [{ name: 'param' }],
        return: { type: 'void' },
      });

      assert.strictEqual(sig, 'NoExtends(param): void');
    });
  });
});

describe('createSignatureCodeBlock', () => {
  it('highlights the signature, its code embedded as markup', async () => {
    // Signatures are highlighted by the Shiki plugin of `jsx-ast`
    await loadMarkdownPlugins({
      name: 'jsx-ast',
      markdown: {
        rehypePlugins: [
          import.meta.resolve('@doc-kit/core/plugins/shiki/rehype.mjs'),
        ],
      },
    });

    const block = createSignatureCodeBlock('fn', {
      params: [{ name: 'a' }],
      return: { type: 'string' },
    });

    assert.deepStrictEqual(block.properties, { className: ['signature'] });

    const [pre] = block.children;
    const [code] = pre.children;

    assert.match(pre.properties.class, /^shiki /);
    assert.equal(code.type, 'mdxJsxFlowElement');
    assert.ok(
      code.attributes.some(({ name }) => name === 'dangerouslySetInnerHTML')
    );
  });
});
