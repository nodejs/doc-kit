import { strictEqual, ok } from 'node:assert';
import { describe, it } from 'node:test';

import { u as createTree } from 'unist-builder';

import { QUERIES, UNIST } from '../index.mjs';

describe('QUERIES', () => {
  describe('standardYamlFrontmatter', () => {
    it('matches standard YAML frontmatter at the beginning of the text', () => {
      const content = '---\nintroduced_in: v1.0.0\ntype: module\n---';
      ok(QUERIES.standardYamlFrontmatter.test(content));

      const match = QUERIES.standardYamlFrontmatter.exec(content);
      strictEqual(match[1], 'introduced_in: v1.0.0\ntype: module');
    });

    it('matches standard YAML frontmatter with Windows line endings (CRLF)', () => {
      const content = '---\r\nintroduced_in: v1.0.0\r\n---';
      ok(QUERIES.standardYamlFrontmatter.test(content));

      const match = QUERIES.standardYamlFrontmatter.exec(content);
      strictEqual(match[1], 'introduced_in: v1.0.0');
    });

    it('does not match horizontal rules or dashes not at the start of the string', () => {
      const content = '# Hello\n\n---\n\nSome text';
      strictEqual(QUERIES.standardYamlFrontmatter.test(content), false);
    });

    it('does not match unclosed frontmatter blocks', () => {
      const content = '---\nintroduced_in: v1.0.0\nSome text...';
      strictEqual(QUERIES.standardYamlFrontmatter.test(content), false);
    });
  });
});

describe('UNIST', () => {
  describe('isStronglyTypedList', () => {
    it('returns false for non-list nodes', () => {
      strictEqual(
        UNIST.isStronglyTypedList(createTree('paragraph', [])),
        false
      );
    });

    it('returns false for empty lists', () => {
      strictEqual(UNIST.isStronglyTypedList(createTree('list', [])), false);
    });

    const cases = [
      {
        name: 'typedListStarters pattern match',
        node: createTree('list', [
          createTree('listItem', [
            createTree('paragraph', [createTree('text', 'Returns: foo')]),
          ]),
        ]),
        expected: true,
      },
      {
        name: 'direct type link pattern',
        node: createTree('list', [
          createTree('listItem', [
            createTree('paragraph', [
              createTree('link', [createTree('inlineCode', '<Type>')]),
            ]),
          ]),
        ]),
        expected: true,
      },
      {
        name: 'inlineCode + space + type link pattern',
        node: createTree('list', [
          createTree('listItem', [
            createTree('paragraph', [
              createTree('inlineCode', 'foo'),
              createTree('text', ' '),
              createTree('link', [createTree('text', '<Bar>')]),
            ]),
          ]),
        ]),
        expected: true,
      },
      {
        name: 'non-matching content',
        node: createTree('list', [
          createTree('listItem', [
            createTree('paragraph', [
              createTree('inlineCode', 'not a valid prop'),
              createTree('text', ' '),
              createTree('link', [createTree('text', '<Bar>')]),
            ]),
          ]),
        ]),
        expected: false,
      },
    ];

    cases.forEach(({ name, node, expected }) => {
      it(`returns ${expected} for ${name}`, () => {
        strictEqual(UNIST.isStronglyTypedList(node), expected);
      });
    });
  });

  describe('isLooselyTypedList', () => {
    it('returns false for non-list nodes', () => {
      strictEqual(
        UNIST.isStronglyTypedList(createTree('paragraph', [])),
        false
      );
    });

    it('returns false for empty lists', () => {
      strictEqual(UNIST.isStronglyTypedList(createTree('list', [])), false);
    });

    const cases = [
      {
        name: 'typedListStarters pattern match',
        node: createTree('list', [
          createTree('listItem', [
            createTree('paragraph', [createTree('text', 'Returns: foo')]),
          ]),
        ]),
        expected: true,
      },
      {
        name: 'direct type link pattern',
        node: createTree('list', [
          createTree('listItem', [
            createTree('paragraph', [
              createTree('link', [createTree('inlineCode', '<Type>')]),
            ]),
          ]),
        ]),
        expected: true,
      },
      {
        name: 'inlineCode + text pattern',
        node: createTree('list', [
          createTree('listItem', [
            createTree('paragraph', [
              createTree('inlineCode', 'foo'),
              createTree('text', ' bar'),
            ]),
          ]),
        ]),
        expected: true,
      },
      {
        name: 'non-matching content',
        node: createTree('list', [
          createTree('listItem', [
            createTree('paragraph', [
              createTree('inlineCode', 'not a valid prop'),
              createTree('text', ' '),
              createTree('link', [createTree('text', '<Bar>')]),
            ]),
          ]),
        ]),
        expected: false,
      },
    ];

    cases.forEach(({ name, node, expected }) => {
      it(`returns ${expected} for ${name}`, () => {
        strictEqual(UNIST.isLooselyTypedList(node), expected);
      });
    });
  });
});
