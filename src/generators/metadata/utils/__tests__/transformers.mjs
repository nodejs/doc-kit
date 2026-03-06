import { strictEqual } from 'node:assert';
import { describe, it } from 'node:test';

import { transformTypeToReferenceLink } from '../transformers.mjs';

describe('transformTypeToReferenceLink', () => {
  it('should transform a JavaScript primitive type into a Markdown link', () => {
    strictEqual(
      transformTypeToReferenceLink('string'),
      '[`<string>`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Data_structures#string_type)'
    );
  });

  it('should transform a JavaScript global type into a Markdown link', () => {
    strictEqual(
      transformTypeToReferenceLink('Array'),
      '[`<Array>`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array)'
    );
  });

  it('should transform a type into a Markdown link', () => {
    strictEqual(
      transformTypeToReferenceLink('SomeOtherType', {
        SomeOtherType: 'fromTypeMap',
      }),
      '[`<SomeOtherType>`](fromTypeMap)'
    );
  });
});
