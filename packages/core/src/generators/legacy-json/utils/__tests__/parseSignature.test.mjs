import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import parseSignature, {
  parseDefaultValue,
  findParameter,
  parseParameters,
  parseNameAndOptionalStatus,
} from '../parseSignature.mjs';

describe('parseNameAndOptionalStatus', () => {
  const testCases = [
    {
      name: 'simple parameter names',
      input: { paramName: 'param', depth: 0 },
      expected: { name: 'param', depth: 0, isOptional: false },
    },
    {
      name: 'optional parameters with brackets',
      input: { paramName: '[param]', depth: 0 },
      expected: { name: 'param', depth: 0, isOptional: true },
    },
    {
      name: 'partial brackets at beginning',
      input: { paramName: '[param', depth: 0 },
      expected: { name: 'param', depth: 1, isOptional: true },
    },
    {
      name: 'partial brackets at end',
      input: { paramName: 'param]', depth: 1 },
      expected: { name: 'param', depth: 0, isOptional: true },
    },
    {
      name: 'complex nested bracket',
      input: { paramName: 'b[', depth: 1 },
      expected: { name: 'b', depth: 2, isOptional: true },
    },
  ];

  for (const testCase of testCases) {
    it(testCase.name, () => {
      const { paramName, depth } = testCase.input;
      const [name, newDepth, isOptional] = parseNameAndOptionalStatus(
        paramName,
        depth
      );
      assert.equal(name, testCase.expected.name);
      assert.equal(newDepth, testCase.expected.depth);
      assert.equal(isOptional, testCase.expected.isOptional);
    });
  }
});

describe('parseDefaultValue', () => {
  const testCases = [
    {
      name: 'extracts default value',
      input: 'param=default',
      expected: { name: 'param', defaultVal: '=default' },
    },
    {
      name: 'handles no default value',
      input: 'param',
      expected: { name: 'param', defaultVal: undefined },
    },
    {
      name: 'handles complex default values',
      input: 'param={x: [1,2,3]}',
      expected: { name: 'param', defaultVal: '={x: [1,2,3]}' },
    },
    {
      name: 'handles multiple equal signs',
      input: 'param=x=y=z',
      expected: { name: 'param', defaultVal: '=x=y=z' },
    },
  ];

  for (const testCase of testCases) {
    it(testCase.name, () => {
      const [name, defaultVal] = parseDefaultValue(testCase.input);
      assert.equal(name, testCase.expected.name);
      assert.equal(defaultVal, testCase.expected.defaultVal);
    });
  }
});

describe('findParameter', () => {
  it('handles various parameter finding scenarios', () => {
    const testCases = [
      {
        name: 'finds by index',
        input: {
          paramName: 'first',
          index: 0,
          params: [{ name: 'first' }, { name: 'second' }],
        },
        expected: { name: 'first' },
      },
      {
        name: 'searches by name',
        input: {
          paramName: 'second',
          index: 0,
          params: [{ name: 'first' }, { name: 'second' }],
        },
        expected: { name: 'second' },
      },
      {
        name: 'finds in nested options',
        input: {
          paramName: 'nested',
          index: 0,
          params: [
            {
              name: 'options',
              options: [
                { name: 'nested', type: 'string', description: 'test' },
              ],
            },
          ],
        },
        expected: { name: 'nested', type: 'string', description: 'test' },
      },
      {
        name: 'returns default when not found',
        input: {
          paramName: 'missing',
          index: 0,
          params: [],
        },
        expected: { name: 'missing' },
      },
    ];

    for (const testCase of testCases) {
      const { paramName, index, params } = testCase.input;
      const result = findParameter(paramName, index, params);

      // Check all expected properties
      for (const key in testCase.expected) {
        assert.equal(result[key], testCase.expected[key]);
      }
    }
  });
});

describe('parseParameters', () => {
  const testCases = [
    {
      name: 'parses simple parameters',
      input: {
        declared: ['param1', 'param2'],
        markdown: [{ name: 'param1' }, { name: 'param2' }],
      },
      expected: [{ name: 'param1' }, { name: 'param2' }],
    },
    {
      name: 'handles default values',
      input: {
        declared: ['param=value'],
        markdown: [{ name: 'param' }],
      },
      expected: [{ name: 'param', default: '=value' }],
    },
    {
      name: 'marks optional parameters',
      input: {
        declared: ['[optional]', 'required'],
        markdown: [{ name: 'optional' }, { name: 'required' }],
      },
      expected: [{ name: 'optional', optional: true }, { name: 'required' }],
    },
    {
      name: 'handles both brackets and default values',
      input: {
        declared: ['[param=default]'],
        markdown: [{ name: 'param' }],
      },
      expected: [{ name: 'param', optional: true, default: '=default' }],
    },
  ];

  for (const testCase of testCases) {
    it(testCase.name, () => {
      const result = parseParameters(
        testCase.input.declared,
        testCase.input.markdown
      );
      assert.equal(result.length, testCase.expected.length);

      for (let i = 0; i < result.length; i++) {
        for (const key in testCase.expected[i]) {
          assert.deepEqual(result[i][key], testCase.expected[i][key]);
        }
      }
    });
  }
});

describe('parseSignature', () => {
  const testCases = [
    {
      name: 'returns empty signature for no parameters',
      input: {
        textRaw: '`method()`',
        markdown: [],
      },
      expected: { params: [] },
    },
    {
      name: 'extracts return value',
      input: {
        textRaw: '`method()`',
        markdown: [{ name: 'return', type: 'string' }],
      },
      expected: {
        params: [],
        return: { name: 'return', type: 'string' },
      },
    },
    {
      name: 'parses method with parameters',
      input: {
        textRaw: '`method(param1, param2)`',
        markdown: [{ name: 'param1' }, { name: 'param2' }],
      },
      expected: {
        params: [{ name: 'param1' }, { name: 'param2' }],
      },
    },
    {
      name: 'parses complex nested optional parameters',
      input: {
        textRaw: '`new Blob([sources[, options]])`',
        markdown: [{ name: 'sources' }, { name: 'options' }],
      },
      expected: {
        params: [
          { name: 'sources', optional: true },
          { name: 'options', optional: true },
        ],
      },
    },
    {
      name: 'handles multiple levels of nested optionals',
      input: {
        textRaw: '`method(a[, b[, c]])`',
        markdown: [{ name: 'a' }, { name: 'b' }, { name: 'c' }],
      },
      expected: {
        params: [
          { name: 'a' },
          { name: 'b', optional: true },
          { name: 'c', optional: true },
        ],
      },
    },
    {
      name: 'handles real-world complex signatures',
      input: {
        textRaw: '`new Console(stdout[, stderr][, ignoreErrors])`',
        markdown: [
          { name: 'stdout' },
          { name: 'stderr' },
          { name: 'ignoreErrors' },
        ],
      },
      expected: {
        params: [
          { name: 'stdout' },
          { name: 'stderr', optional: true },
          { name: 'ignoreErrors', optional: true },
        ],
      },
    },
    {
      name: 'handles un-backticked method signatures without dropping arguments',
      input: {
        textRaw: 'new Console(options)',
        markdown: [{ name: 'options' }],
      },
      expected: {
        params: [{ name: 'options' }],
      },
    },
    {
      name: 'handles standard method signatures without backticks',
      input: {
        textRaw: 'foo(a, b)',
        markdown: [{ name: 'a' }, { name: 'b' }],
      },
      expected: {
        params: [{ name: 'a' }, { name: 'b' }],
      },
    },
  ];

  for (const testCase of testCases) {
    it(testCase.name, () => {
      const result = parseSignature(
        testCase.input.textRaw,
        testCase.input.markdown
      );

      if (testCase.expected.return) {
        assert.equal(result.return.name, testCase.expected.return.name);
        assert.equal(result.return.type, testCase.expected.return.type);
      }

      assert.equal(result.params.length, testCase.expected.params.length);

      for (let i = 0; i < result.params.length; i++) {
        for (const key in testCase.expected.params[i]) {
          assert.deepEqual(
            result.params[i][key],
            testCase.expected.params[i][key],
            `Param ${i} property ${key} mismatch`
          );
        }
      }
    });
  }
});
