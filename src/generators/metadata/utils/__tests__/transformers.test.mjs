import { strictEqual } from 'node:assert';
import { describe, it } from 'node:test';

import { lookupTypeName, resolveTypeReference } from '../transformers.mjs';

describe('lookupTypeName', () => {
  it('resolves from the type map first', () => {
    strictEqual(lookupTypeName('string', { string: 'override' }), 'override');
  });

  it('resolves JavaScript primitives from the built-in map', () => {
    strictEqual(
      lookupTypeName('string'),
      'https://developer.mozilla.org/docs/Web/JavaScript/Data_structures#string_type'
    );
  });

  it('resolves JavaScript globals from the built-in map (case-insensitive)', () => {
    strictEqual(
      lookupTypeName('Array'),
      'https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array'
    );
  });

  it('resolves Web APIs from the MDN map', () => {
    strictEqual(
      lookupTypeName('AbortSignal'),
      'https://developer.mozilla.org/docs/Web/API/AbortSignal'
    );
  });

  it('resolves display-name map keys verbatim', () => {
    strictEqual(
      lookupTypeName('zlib options', { 'zlib options': 'zlib.html#options' }),
      'zlib.html#options'
    );
  });

  it('returns an empty string on a miss (no dotted heuristic)', () => {
    strictEqual(lookupTypeName('vm.Module'), '');
    strictEqual(lookupTypeName('NotAThing'), '');
  });
});

describe('resolveTypeReference', () => {
  it('falls back to the dotted-name heuristic for classes', () => {
    strictEqual(resolveTypeReference('vm.Module'), 'vm.html#class-vmmodule');
  });

  it('does not use the class prefix for non-class members', () => {
    strictEqual(resolveTypeReference('vm.constants'), 'vm.html#vmconstants');
  });

  it('prefers the map over the dotted heuristic', () => {
    strictEqual(
      resolveTypeReference('vm.Module', { 'vm.Module': 'mapped' }),
      'mapped'
    );
  });

  it('returns an empty string for unknown plain names', () => {
    strictEqual(resolveTypeReference('NotAThing'), '');
  });
});
