import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { u } from 'unist-builder';

import { extractListItem, removeDefault } from '../extractListItem.mjs';

const code = value => u('inlineCode', value);
const text = value => u('text', value);
const type = value => u('typeAnnotation', { value });
const strong = value => u('strong', [text(value)]);
const item = (children, ...blocks) =>
  u('listItem', [u('paragraph', children), ...blocks]);

describe('extractListItem', () => {
  it('takes a named, typed item apart', () => {
    const result = extractListItem(
      item([code('path'), text(' '), type('string | URL'), text(' The file.')])
    );

    assert.equal(result.name, 'path');
    assert.equal(result.prefix, undefined);
    assert.equal(result.annotation.value, 'string | URL');
    assert.deepEqual(result.text, [text('The file.')]);
    assert.equal(result.default, undefined);
    assert.deepEqual(result.blocks, []);
    assert.deepEqual(result.items, []);
  });

  it('recognises the special prefixes', () => {
    const returns = extractListItem(
      item([text('Returns: '), type('Promise'), text(' Fulfills on close.')])
    );
    assert.equal(returns.prefix, 'Returns');
    assert.equal(returns.name, undefined);
    assert.equal(returns.annotation.value, 'Promise');
    assert.deepEqual(returns.text, [text('Fulfills on close.')]);

    const extendsItem = extractListItem(
      item([text('Extends: '), type('EventEmitter')])
    );
    assert.equal(extendsItem.prefix, 'Extends');
    assert.equal(extendsItem.annotation.value, 'EventEmitter');
    assert.deepEqual(extendsItem.text, []);

    const typeItem = extractListItem(
      item([text('Type:'), text(' '), type('integer')])
    );
    assert.equal(typeItem.prefix, 'Type');
    assert.equal(typeItem.annotation.value, 'integer');
  });

  it('keeps a prefix remainder that is not blank', () => {
    const result = extractListItem(item([text('Returns: description here')]));

    assert.equal(result.prefix, 'Returns');
    assert.deepEqual(result.text, [text('description here')]);
  });

  it('trims leading separators from the description', () => {
    const result = extractListItem(
      item([code('opt'), text(' '), type('boolean'), text(' - the option')])
    );

    assert.deepEqual(result.text, [text('the option')]);
  });

  it('drops a description that is only separators', () => {
    const result = extractListItem(item([code('opt'), text(': ')]));

    assert.deepEqual(result.text, []);
  });

  it('extracts the default value and leaves its marker in the text', () => {
    const nodes = [
      code('encoding'),
      text(' '),
      type('string'),
      text(' The encoding. '),
      strong('Default:'),
      text(' '),
      code("'utf8'"),
      text('.'),
    ];
    const result = extractListItem(item(nodes));

    assert.equal(result.default, "`'utf8'`");
    assert.deepEqual(
      result.text,
      nodes.slice(3).with(0, text('The encoding. '))
    );
    assert.deepEqual(removeDefault(result.text), [text('The encoding.')]);
  });

  it('separates the nested typed list from other blocks', () => {
    const nested = u('list', [item([code('flag'), text(' '), type('string')])]);
    const note = u('paragraph', [text('A note.')]);
    const result = extractListItem(
      item([code('options'), text(' '), type('Object')], nested, note)
    );

    assert.deepEqual(result.items, nested.children);
    assert.deepEqual(result.blocks, [note]);
  });

  it('leaves the source nodes untouched', () => {
    const paragraph = u('paragraph', [
      code('a'),
      text(' '),
      type('b'),
      text(' - c'),
    ]);
    const source = u('listItem', [paragraph]);
    const before = structuredClone(source);

    extractListItem(source);

    assert.deepEqual(source, before);
  });

  it('handles an item without a paragraph', () => {
    const result = extractListItem(u('listItem', []));

    assert.deepEqual(result.text, []);
    assert.equal(result.name, undefined);
  });
});

describe('removeDefault', () => {
  it('returns the nodes unchanged when there is no default', () => {
    const nodes = [text('No default.')];

    assert.equal(removeDefault(nodes), nodes);
  });

  it('drops the marker and everything after it', () => {
    const nodes = [
      text('Before'),
      text(' '),
      strong('Default:'),
      code('1'),
      text(' after'),
    ];

    assert.deepEqual(removeDefault(nodes), [text('Before')]);
  });
});
