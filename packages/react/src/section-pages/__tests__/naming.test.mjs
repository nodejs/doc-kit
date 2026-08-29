import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createUniqueNamer, toFileName } from '../utils/naming.mjs';

describe('toFileName', () => {
  const typed = { type: 'method' };
  const prose = {};

  it('keeps the case of API names and drops the module prefix', () => {
    assert.equal(toFileName('fs.readFile', typed, 'fs'), 'readFile');
    assert.equal(toFileName('fs.Dir', { type: 'class' }, 'fs'), 'Dir');
  });

  it('keeps other namespaces as part of the name', () => {
    assert.equal(
      toFileName('fsPromises.readFile', typed, 'fs'),
      'fsPromises.readFile'
    );
  });

  it('strips quotes and constructor keywords', () => {
    assert.equal(toFileName("'close'", { type: 'event' }, 'net'), 'close');
    assert.equal(
      toFileName('new v8.Deserializer', { type: 'ctor' }, 'v8'),
      'Deserializer'
    );
  });

  it('slugs prose headings, even when they would be safe file names', () => {
    assert.equal(toFileName('Callback API', prose, 'fs'), 'callback-api');
    assert.equal(toFileName('Notes', prose, 'fs'), 'notes');
  });

  it('slugs API names that are not safe file names', () => {
    assert.equal(
      toFileName('napi_create_string_utf8()', typed, 'n-api'),
      'napi_create_string_utf8'
    );
  });
});

describe('createUniqueNamer', () => {
  it('suffixes repeated names, ignoring case', () => {
    const unique = createUniqueNamer();

    assert.equal(unique('close'), 'close');
    assert.equal(unique('close'), 'close-2');
    assert.equal(unique('Close'), 'Close-3');
    assert.equal(unique('open'), 'open');
  });
});
