import { strictEqual, deepStrictEqual } from 'node:assert';
import { describe, it } from 'node:test';

import { parseYAMLIntoMetadata, normalizeYamlSyntax } from '../yaml.mjs';

describe('normalizeYamlSyntax', () => {
  it('should normalize YAML syntax by fixing noncompliant properties', () => {
    const input = `introduced_in=v0.1.21
source_link=lib/test.js
type=module
name=test_module
llm_description=This is a test module`;

    const normalizedYaml = normalizeYamlSyntax(input);

    strictEqual(
      normalizedYaml,
      `introduced_in: v0.1.21
source_link: lib/test.js
type: module
name: test_module
llm_description: This is a test module`
    );
  });

  it('should remove leading and trailing newlines', () => {
    const input = '\nintroduced_in=v0.1.21\n';

    const normalizedYaml = normalizeYamlSyntax(input);

    strictEqual(normalizedYaml, 'introduced_in: v0.1.21');
  });
});

describe('parseYAMLIntoMetadata', () => {
  it('should parse a YAML string into a JavaScript object', () => {
    const input = 'name: test\ntype: module\nintroduced_in: v1.0.0';
    const expectedOutput = {
      name: 'test',
      type: 'module',
      introduced_in: 'v1.0.0',
    };
    deepStrictEqual(parseYAMLIntoMetadata(input), expectedOutput);
  });

  it('should parse a YAML string with multiple versions into a JavaScript object', () => {
    const input = 'name: test\ntype: module\nintroduced_in: [v1.0.0, v1.1.0]';
    const expectedOutput = {
      name: 'test',
      type: 'module',
      introduced_in: ['v1.0.0', 'v1.1.0'],
    };
    deepStrictEqual(parseYAMLIntoMetadata(input), expectedOutput);
  });

  it('should parse a YAML string with source_link into a JavaScript object', () => {
    const input =
      'name: test\ntype: module\nintroduced_in: v1.0.0\nsource_link: https://github.com/nodejs/node';
    const expectedOutput = {
      name: 'test',
      type: 'module',
      introduced_in: 'v1.0.0',
      source_link: 'https://github.com/nodejs/node',
    };
    deepStrictEqual(parseYAMLIntoMetadata(input), expectedOutput);
  });
});
