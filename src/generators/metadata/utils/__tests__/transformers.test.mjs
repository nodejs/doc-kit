import { strictEqual } from 'node:assert';
import { describe, it } from 'node:test';

import { transformTypeToReferenceLink } from '../transformers.mjs';

describe('transformTypeToReferenceLink', () => {
  it('should transform a JavaScript primitive type into a Markdown link', () => {
    strictEqual(
      transformTypeToReferenceLink('string'),
      '[`<string>`](https://developer.mozilla.org/docs/Web/JavaScript/Data_structures#string_type)'
    );
  });

  it('should transform a JavaScript global type into a Markdown link', () => {
    strictEqual(
      transformTypeToReferenceLink('Array'),
      '[`<Array>`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array)'
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

  it('should transform a basic Generic type into a Markdown link', () => {
    strictEqual(
      transformTypeToReferenceLink('{Promise<string>}'),
      '[`<Promise>`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)&lt;[`<string>`](https://developer.mozilla.org/docs/Web/JavaScript/Data_structures#string_type)&gt;'
    );
  });

  it('should partially transform a Generic type if only one part is known', () => {
    strictEqual(
      transformTypeToReferenceLink('{CustomType<string>}', {}),
      '`<CustomType>`&lt;[`<string>`](https://developer.mozilla.org/docs/Web/JavaScript/Data_structures#string_type)&gt;'
    );
  });

  it('should transform a Generic type with an inner union like {Promise<string|boolean>}', () => {
    strictEqual(
      transformTypeToReferenceLink('{Promise<string|boolean>}', {}),
      '[`<Promise>`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)&lt;[`<string>`](https://developer.mozilla.org/docs/Web/JavaScript/Data_structures#string_type) | [`<boolean>`](https://developer.mozilla.org/docs/Web/JavaScript/Data_structures#boolean_type)&gt;'
    );
  });

  it('should transform multi-parameter generics like {Map<string, number>}', () => {
    strictEqual(
      transformTypeToReferenceLink('{Map<string, number>}', {}),
      '[`<Map>`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Map)&lt;[`<string>`](https://developer.mozilla.org/docs/Web/JavaScript/Data_structures#string_type), [`<number>`](https://developer.mozilla.org/docs/Web/JavaScript/Data_structures#number_type)&gt;'
    );
  });

  it('should handle outer unions with generics like {Promise<string|number> | boolean}', () => {
    strictEqual(
      transformTypeToReferenceLink('{Promise<string|number> | boolean}', {}),
      '[`<Promise>`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)&lt;[`<string>`](https://developer.mozilla.org/docs/Web/JavaScript/Data_structures#string_type) | [`<number>`](https://developer.mozilla.org/docs/Web/JavaScript/Data_structures#number_type)&gt; | [`<boolean>`](https://developer.mozilla.org/docs/Web/JavaScript/Data_structures#boolean_type)'
    );
  });

  it('should transform an intersection type joined with & into linked parts', () => {
    strictEqual(
      transformTypeToReferenceLink('{string&boolean}', {}),
      '[`<string>`](https://developer.mozilla.org/docs/Web/JavaScript/Data_structures#string_type) & [`<boolean>`](https://developer.mozilla.org/docs/Web/JavaScript/Data_structures#boolean_type)'
    );
  });

  it('should handle an intersection with generics like {Map<string, number>&Array<string>}', () => {
    strictEqual(
      transformTypeToReferenceLink('{Map<string, number>&Array<string>}', {}),
      '[`<Map>`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Map)&lt;[`<string>`](https://developer.mozilla.org/docs/Web/JavaScript/Data_structures#string_type), [`<number>`](https://developer.mozilla.org/docs/Web/JavaScript/Data_structures#number_type)&gt; & [`<Array>`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array)&lt;[`<string>`](https://developer.mozilla.org/docs/Web/JavaScript/Data_structures#string_type)&gt;'
    );
  });
});
