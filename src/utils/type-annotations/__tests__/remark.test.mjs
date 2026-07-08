import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import remarkStringify from 'remark-stringify';
import { unified } from 'unified';
import { selectAll } from 'unist-util-select';

import remarkTypeAnnotations from '../remark.mjs';

const processor = unified()
  .use(remarkParse)
  .use(remarkTypeAnnotations)
  .use(remarkGfm)
  .use(remarkStringify);

const annotationsIn = markdown =>
  selectAll('typeAnnotation', processor.parse(markdown));

const valuesIn = markdown => annotationsIn(markdown).map(node => node.value);

describe('remarkTypeAnnotations', () => {
  it('parses a simple annotation in prose', () => {
    assert.deepEqual(valuesIn('A {string} here.'), ['string']);
  });

  it('parses multiple annotations in one paragraph', () => {
    assert.deepEqual(valuesIn('{string} and {Buffer|Blob} and {integer}'), [
      'string',
      'Buffer|Blob',
      'integer',
    ]);
  });

  it('supports nested braces (object literal types)', () => {
    assert.deepEqual(valuesIn('Takes {Record<string, {a: number}>} maps.'), [
      'Record<string, {a: number}>',
    ]);
  });

  it('supports generics with angle brackets', () => {
    assert.deepEqual(valuesIn('Returns {Promise<string>} always.'), [
      'Promise<string>',
    ]);
  });

  it('supports arrow function types', () => {
    assert.deepEqual(valuesIn('A {(err: Error) => void} callback.'), [
      '(err: Error) => void',
    ]);
  });

  it('decodes legacy character escapes', () => {
    assert.deepEqual(valuesIn('An array {string\\[]} of them.'), ['string[]']);
  });

  it('decodes escaped pipes inside GFM table cells', () => {
    const markdown = [
      '| Option | Type |',
      '| ------ | ---- |',
      '| `flag` | {string\\|number} |',
    ].join('\n');

    assert.deepEqual(valuesIn(markdown), ['string|number']);
  });

  it('normalizes interior line breaks to spaces', () => {
    assert.deepEqual(valuesIn('Some {string |\nBuffer} union.'), [
      'string | Buffer',
    ]);
  });

  it('does not match an escaped opening brace', () => {
    assert.deepEqual(valuesIn('Literal \\{not a type} braces.'), []);
  });

  it('does not match template literal prose (`${...}`)', () => {
    assert.deepEqual(valuesIn('Use ${foo} for interpolation.'), []);
  });

  it('does not match empty braces', () => {
    assert.deepEqual(valuesIn('An empty {} object.'), []);
  });

  it('leaves an unbalanced brace as literal text', () => {
    const tree = processor.parse('An { unclosed brace.');

    assert.deepEqual(selectAll('typeAnnotation', tree), []);
    assert.match(
      selectAll('text', tree)
        .map(node => node.value)
        .join(''),
      /\{ unclosed brace\./
    );
  });

  it('does not match inside code spans', () => {
    assert.deepEqual(valuesIn('Use `{string}` literally.'), []);
  });

  it('does not match inside fenced code blocks', () => {
    assert.deepEqual(valuesIn('```js\nconst a = {string: 1};\n```'), []);
  });

  it('consumes URLs in braces as (invalid) annotations', () => {
    // "ANYTHING within {} is a Type" — this parses but won't be valid TS
    assert.deepEqual(valuesIn('See {http://example.com} for more.'), [
      'http://example.com',
    ]);
  });

  it('parses annotations inside emphasis and headings', () => {
    assert.deepEqual(valuesIn('_a {string} inside_\n\n## Head {integer}'), [
      'string',
      'integer',
    ]);
  });

  it('round-trips through stringify', () => {
    const output = processor.stringify(
      processor.parse('Returns: {Promise<Buffer|string>} on success.')
    );

    assert.match(output, /\{Promise<Buffer\|string>\}/);
  });
});
