import assert from 'node:assert/strict';
import { describe, it, mock, beforeEach } from 'node:test';

const warnings = [];

mock.module('../../../../logger/index.mjs', {
  defaultExport: {
    warn: message => warnings.push(message),
  },
});

const { resolveTypeAnnotations } = await import('../resolveTypes.mjs');

const HTTP2_TYPE_MAP = {
  'HTTP/2 Headers Object': 'http2.html#headers-object',
};

/**
 * Resolves a single annotation and returns its node
 *
 * @param {string} value The type value
 * @param {Record<string, string>} typeMap The mapping of types to links
 */
const resolve = (value, typeMap = {}) => {
  const node = { type: 'typeAnnotation', value };

  resolveTypeAnnotations(
    { type: 'root', children: [node] },
    typeMap,
    'test.md'
  );

  return node;
};

/**
 * Resolves a single annotation and returns its links as `[text, href]` pairs,
 * asserting that every range lines up with the text it links
 *
 * @param {string} value The type value
 * @param {Record<string, string>} typeMap The mapping of types to links
 */
const linksIn = (value, typeMap = {}) => {
  const { data } = resolve(value, typeMap);

  for (const link of data.links) {
    assert.equal(value.slice(link.start, link.end), link.text);
  }

  return data.links.map(({ text, href }) => [text, href]);
};

describe('resolveTypeAnnotations', () => {
  beforeEach(() => {
    warnings.length = 0;
  });

  it('links a type that is a whole map key', () => {
    assert.deepEqual(linksIn('HTTP/2 Headers Object', HTTP2_TYPE_MAP), [
      ['HTTP/2 Headers Object', 'http2.html#headers-object'],
    ]);
    assert.deepEqual(warnings, []);
  });

  it('links an array of a display name', () => {
    assert.deepEqual(linksIn('HTTP/2 Headers Object[]', HTTP2_TYPE_MAP), [
      ['HTTP/2 Headers Object', 'http2.html#headers-object'],
    ]);
    assert.deepEqual(warnings, []);
  });

  it('resolves module-qualified names alongside display names', () => {
    assert.deepEqual(linksIn('Module Namespace Object | vm.Module'), [
      [
        'Module Namespace Object',
        'https://tc39.github.io/ecma262/#sec-module-namespace-exotic-objects',
      ],
      ['vm.Module', 'vm.html#class-vmmodule'],
    ]);
    assert.deepEqual(warnings, []);
  });

  it('keeps the resolvable parts of a partly unknown union', () => {
    assert.deepEqual(
      linksIn('HTTP/2 Headers Object | HTTP/2 Raw Headers', HTTP2_TYPE_MAP),
      [['HTTP/2 Headers Object', 'http2.html#headers-object']]
    );
    assert.deepEqual(warnings, []);
  });

  it('warns when no part of an unparsable type resolves', () => {
    const node = resolve('HTTP/2 Raw Headers', HTTP2_TYPE_MAP);

    assert.equal(node.data.parseError, true);
    assert.deepEqual(node.data.links, []);
    assert.deepEqual(warnings, [
      'Invalid type annotation: {HTTP/2 Raw Headers}',
    ]);
  });

  it('marks which values are TypeScript, for the highlighter', () => {
    const isTypeScript = (value, typeMap) =>
      resolve(value, typeMap).data.typescript;

    assert.equal(isTypeScript('Promise<string> | null'), true);
    assert.equal(isTypeScript('HTTP/2 Headers Object', HTTP2_TYPE_MAP), false);
    assert.equal(isTypeScript('Module Namespace Object | vm.Module'), false);
    assert.equal(isTypeScript('HTTP/2 Raw Headers', HTTP2_TYPE_MAP), false);
  });

  it('parses valid TypeScript rather than splitting it', () => {
    assert.deepEqual(
      linksIn('Promise<string> | Buffer', { Buffer: 'buffer.html#buffer' }),
      [
        [
          'Promise',
          'https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise',
        ],
        [
          'string',
          'https://developer.mozilla.org/docs/Web/JavaScript/Data_structures#string_type',
        ],
        ['Buffer', 'buffer.html#buffer'],
      ]
    );
    assert.deepEqual(warnings, []);
  });

  it('resolves every annotation in a nested tree', () => {
    const STRING_URL =
      'https://developer.mozilla.org/docs/Web/JavaScript/Data_structures#string_type';

    // Two per paragraph: a visitor that skips siblings still reaches the first
    const nodes = ['string', 'HTTP/2 Headers Object', 'string', 'string'].map(
      value => ({ type: 'typeAnnotation', value })
    );

    resolveTypeAnnotations(
      {
        type: 'root',
        children: [
          { type: 'paragraph', children: nodes.slice(0, 2) },
          { type: 'paragraph', children: nodes.slice(2) },
        ],
      },
      HTTP2_TYPE_MAP,
      'test.md'
    );

    assert.deepEqual(
      nodes.map(({ data }) => data.links.map(({ href }) => href)),
      [[STRING_URL], ['http2.html#headers-object'], [STRING_URL], [STRING_URL]]
    );
  });
});
