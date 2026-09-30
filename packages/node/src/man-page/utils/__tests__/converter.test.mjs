import { strictEqual } from 'node:assert';
import { describe, it } from 'node:test';

import { u } from 'unist-builder';

import {
  convertNodeToMandoc,
  flagValueToMandoc,
  convertOptionToMandoc,
  convertEnvVarToMandoc,
} from '../converter.mjs';

const textNode = text => u('text', text);

const createMockElement = (headingText, description) => ({
  heading: { data: { text: headingText } },
  // eslint-disable-next-line no-sparse-arrays
  content: u('root', [, u('paragraph', [textNode(description)])]),
});

const runTests = (cases, conversionFunc) => {
  cases.forEach(({ input, expected }) => {
    strictEqual(conversionFunc(input), expected);
  });
};

describe('Mandoc Conversion', () => {
  describe('Node Conversion', () => {
    it('should convert a root node with heading and paragraph', () => {
      const node = u('root', [
        u('heading', { depth: 1 }, [textNode('Main Title')]),
        u('paragraph', [textNode('Introductory text.')]),
      ]);
      strictEqual(
        convertNodeToMandoc(node),
        '.Sh Main Title\nIntroductory text.'
      );
    });

    it('should convert various nodes to Mandoc', () => {
      const cases = [
        {
          input: u('heading', { depth: 2 }, [textNode('Heading')]),
          expected: '.Sh Heading',
        },
        { input: textNode('Some text'), expected: 'Some text' },
        {
          input: textNode('Text with a backslash: \\\\'),
          expected: 'Text with a backslash: \\\\\\\\',
        },
        {
          input: u('list', [
            u('listItem', [textNode('Item 1')]),
            u('listItem', [textNode('Item 2')]),
          ]),
          expected: '.Bl -bullet\n.It\nItem 1\n.It\nItem 2\n.El',
        },
        {
          input: u('code', 'const a = 1;'),
          expected: '.Bd -literal\nconst a = 1;\n.Ed',
        },
        {
          input: u('inlineCode', 'inline code'),
          expected: '\\fBinline code\\fR',
        },
        {
          input: u('emphasis', [textNode('emphasized text')]),
          expected: '\\fIemphasized text\\fR',
        },
        {
          input: u('blockquote', [
            u('paragraph', [textNode('This is a quote.')]),
          ]),
          expected: '',
        },
        { input: u('paragraph', []), expected: '' },
        { input: u('list', []), expected: '.Bl -bullet\n\n.El' },
        {
          input: u('strong', [textNode('strongly emphasized text')]),
          expected: '\\fBstrongly emphasized text\\fR',
        },
      ];
      runTests(cases, convertNodeToMandoc);
    });
  });

  describe('Flag Value Formatting', () => {
    it('should format flag values correctly', () => {
      const cases = [
        { input: '-o value', expected: ' Ar value' },
        { input: '--flag=value', expected: ' Ns = Ns Ar value' },
        { input: '-n', expected: '' },
        { input: '-f value1,value2', expected: ' Ar value1,value2' },
        {
          input: '--multi-flag=value1,value2,value3',
          expected: ' Ns = Ns Ar value1,value2,value3',
        },
        { input: '-x', expected: '' },
        {
          input: '--flag[=optional value]',
          expected: ' Ns = Ns Ar [optional value]',
        },
      ];
      runTests(cases, flagValueToMandoc);
    });
  });

  describe('Option Conversion', () => {
    it('should convert options to Mandoc format', () => {
      const mockElement = createMockElement(
        '`-a`, `-b=value`',
        'Description of the options.'
      );
      strictEqual(
        convertOptionToMandoc(mockElement),
        `.It Fl a , Fl b Ns = Ns Ar value\nDescription of the options.\n.\n`
      );
    });

    it('should handle options without values', () => {
      const mockElement = createMockElement(
        '`-a`',
        'Description of the option without a value.'
      );
      strictEqual(
        convertOptionToMandoc(mockElement),
        `.It Fl a\nDescription of the option without a value.\n.\n`
      );
    });

    it('should handle multiple options in a single heading', () => {
      const mockElement = createMockElement(
        '`-x`, `-y`, `-z=value`',
        'Description of multiple options.'
      );
      strictEqual(
        convertOptionToMandoc(mockElement),
        `.It Fl x , Fl y , Fl z Ns = Ns Ar value\nDescription of multiple options.\n.\n`
      );
    });

    it('should handle options with special characters', () => {
      const mockElement = createMockElement(
        '`-d`, `--option=value with spaces`',
        'Description of special options.'
      );
      strictEqual(
        convertOptionToMandoc(mockElement),
        `.It Fl d , Fl -option Ns = Ns Ar value with spaces\nDescription of special options.\n.\n`
      );
    });
  });

  describe('Environment Variable Conversion', () => {
    it('should convert environment variables to Mandoc format', () => {
      const mockElement = createMockElement(
        '`MY_VAR=some_value`',
        'Description of the environment variable.'
      );
      strictEqual(
        convertEnvVarToMandoc(mockElement),
        `.It Ev MY_VAR Ar some_value\nDescription of the environment variable.\n.\n`
      );
    });

    it('should handle environment variables without values', () => {
      const mockElement = createMockElement(
        '`MY_VAR=`',
        'Description of the environment variable without a value.'
      );
      strictEqual(
        convertEnvVarToMandoc(mockElement),
        `.It Ev MY_VAR\nDescription of the environment variable without a value.\n.\n`
      );
    });

    it('should handle environment variables with special characters', () => {
      const mockElement = createMockElement(
        '`SPECIAL_VAR=special value!`',
        'Description of special environment variable.'
      );
      strictEqual(
        convertEnvVarToMandoc(mockElement),
        `.It Ev SPECIAL_VAR Ar special value!\nDescription of special environment variable.\n.\n`
      );
    });
  });
});
