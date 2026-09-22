import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { u } from 'unist-builder';

import { classify, nodeName } from '../node.mjs';

const entry = (text, type, extra = {}) => ({
  heading: {
    type: 'heading',
    depth: 3,
    children: [u('inlineCode', text.replace(/`/g, ''))],
    data: { text, name: text, type },
  },
  ...extra,
});

describe('classify', () => {
  it('maps the heading classification to a kind', () => {
    assert.deepEqual(classify(entry('`foo()`', 'method')), { kind: 'method' });
    assert.deepEqual(classify(entry('`new Foo()`', 'ctor')), {
      kind: 'constructor',
    });
    assert.deepEqual(classify(entry('`Foo.bar()`', 'classMethod')), {
      kind: 'staticMethod',
    });
    assert.deepEqual(classify(entry('Notes', undefined)), { kind: 'section' });
    assert.deepEqual(classify(entry('Notes', 'misc')), { kind: 'section' });
    assert.deepEqual(classify(entry('Example', 'example')), {
      kind: 'section',
    });
  });

  it('turns a global override into a scope, re-reading the kind from the heading', () => {
    assert.deepEqual(classify(entry('`globalThis.foo()`', 'global')), {
      kind: 'method',
      scope: 'global',
    });
  });
});

describe('nodeName', () => {
  it('prefers a name directive', () => {
    assert.equal(
      nodeName(
        entry('Signal events', 'event', { name: 'SIGINT, SIGHUP, etc.' }),
        'event'
      ),
      'SIGINT, SIGHUP, etc.'
    );
  });

  it('uses the plain heading text for a section', () => {
    const section = {
      heading: {
        children: [
          u('text', 'DEP0005: '),
          u('inlineCode', 'Buffer()'),
          u('text', ' constructor'),
        ],
        data: {
          text: 'DEP0005: `Buffer()` constructor',
          name: 'DEP0005: `Buffer()` constructor',
        },
      },
    };

    assert.equal(nodeName(section, 'section'), 'DEP0005: Buffer() constructor');
  });

  it('strips the qualifier and extends clause from class names', () => {
    const named = name => ({
      heading: { children: [], data: { text: name, name } },
    });

    assert.equal(nodeName(named('http.Server'), 'class'), 'Server');
    assert.equal(nodeName(named('Foo extends Bar'), 'class'), 'Foo');
    assert.equal(nodeName(named('buffer.Blob'), 'constructor'), 'Blob');
  });

  it('keeps the bare name of everything else', () => {
    const named = name => ({
      heading: { children: [], data: { text: name, name } },
    });

    assert.equal(nodeName(named('readFile'), 'method'), 'readFile');
    assert.equal(nodeName(named('close'), 'event'), 'close');
  });
});
