import { strictEqual } from 'node:assert';
import { describe, it } from 'node:test';

import { u as createTree } from 'unist-builder';

import { UNIST } from '../index.mjs';

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
