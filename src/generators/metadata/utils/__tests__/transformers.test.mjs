import { strictEqual } from 'node:assert';
import { describe, it } from 'node:test';

import { transformTypeToReferenceLink } from '../transformers.mjs';

describe('transformTypeToReferenceLink', () => {
  it('should transform a JavaScript primitive type into a Markdown link', () => {
    strictEqual(
      transformTypeToReferenceLink('string'),
      '<code><[string](https://developer.mozilla.org/docs/Web/JavaScript/Data_structures#string_type)></code>'
    );
  });

  it('should transform a JavaScript global type into a Markdown link', () => {
    strictEqual(
      transformTypeToReferenceLink('Array'),
      '<code><[Array](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array)></code>'
    );
  });

  it('should transform a type into a Markdown link', () => {
    strictEqual(
      transformTypeToReferenceLink('SomeOtherType', {
        SomeOtherType: 'fromTypeMap',
      }),
      '<code><[SomeOtherType](fromTypeMap)></code>'
    );
  });

  it('should transform a basic Generic type into a Markdown link', () => {
    strictEqual(
      transformTypeToReferenceLink('{Promise<string>}'),
      '<code><[Promise](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<[string](https://developer.mozilla.org/docs/Web/JavaScript/Data_structures#string_type)>></code>'
    );
  });

  it('should partially transform a Generic type if only one part is known', () => {
    strictEqual(
      transformTypeToReferenceLink('{CustomType<string>}', {}),
      '<code><CustomType<[string](https://developer.mozilla.org/docs/Web/JavaScript/Data_structures#string_type)>></code>'
    );
  });

  it('should transform a Generic type with an inner union like {Promise<string|boolean>}', () => {
    strictEqual(
      transformTypeToReferenceLink('{Promise<string|boolean>}', {}),
      '<code><[Promise](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<[string](https://developer.mozilla.org/docs/Web/JavaScript/Data_structures#string_type) | [boolean](https://developer.mozilla.org/docs/Web/JavaScript/Data_structures#boolean_type)>></code>'
    );
  });

  it('should transform multi-parameter generics like {Map<string, number>}', () => {
    strictEqual(
      transformTypeToReferenceLink('{Map<string, number>}', {}),
      '<code><[Map](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Map)<[string](https://developer.mozilla.org/docs/Web/JavaScript/Data_structures#string_type), [number](https://developer.mozilla.org/docs/Web/JavaScript/Data_structures#number_type)>></code>'
    );
  });

  it('should handle outer unions with generics like {Promise<string|number> | boolean}', () => {
    strictEqual(
      transformTypeToReferenceLink('{Promise<string|number> | boolean}', {}),
      '<code><[Promise](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<[string](https://developer.mozilla.org/docs/Web/JavaScript/Data_structures#string_type) | [number](https://developer.mozilla.org/docs/Web/JavaScript/Data_structures#number_type)> | [boolean](https://developer.mozilla.org/docs/Web/JavaScript/Data_structures#boolean_type)></code>'
    );
  });

  it('should transform an intersection type joined with & into linked parts', () => {
    strictEqual(
      transformTypeToReferenceLink('{string&boolean}', {}),
      '<code><[string](https://developer.mozilla.org/docs/Web/JavaScript/Data_structures#string_type) & [boolean](https://developer.mozilla.org/docs/Web/JavaScript/Data_structures#boolean_type)></code>'
    );
  });

  it('should handle an intersection with generics like {Map<string, number>&Array<string>}', () => {
    strictEqual(
      transformTypeToReferenceLink('{Map<string, number>&Array<string>}', {}),
      '<code><[Map](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Map)<[string](https://developer.mozilla.org/docs/Web/JavaScript/Data_structures#string_type), [number](https://developer.mozilla.org/docs/Web/JavaScript/Data_structures#number_type)> & [Array](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array)<[string](https://developer.mozilla.org/docs/Web/JavaScript/Data_structures#string_type)>></code>'
    );
  });

  it('should transform a function returning a Generic type', () => {
    strictEqual(
      transformTypeToReferenceLink('(err: Error) => Promise<boolean>', {}),
      '<code><(err: [Error](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Error)) => [Promise](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<[boolean](https://developer.mozilla.org/docs/Web/JavaScript/Data_structures#boolean_type)>></code>'
    );
  });

  it('should respect precedence: Unions (|) are weaker than Intersections (&)', () => {
    strictEqual(
      transformTypeToReferenceLink('string | number & boolean', {}),
      '<code><[string](https://developer.mozilla.org/docs/Web/JavaScript/Data_structures#string_type) | [number](https://developer.mozilla.org/docs/Web/JavaScript/Data_structures#number_type) & [boolean](https://developer.mozilla.org/docs/Web/JavaScript/Data_structures#boolean_type)></code>'
    );
  });

  it('should handle extreme nested combinations of functions, arrays, generics, unions, and intersections', () => {
    const input =
      '(str: string[]) => Promise<Map<string, number & string>, Map<string | number>>';

    const expected =
      '<code><(str: [string](https://developer.mozilla.org/docs/Web/JavaScript/Data_structures#string_type)[]) => [Promise](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)<[Map](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Map)<[string](https://developer.mozilla.org/docs/Web/JavaScript/Data_structures#string_type), [number](https://developer.mozilla.org/docs/Web/JavaScript/Data_structures#number_type) & [string](https://developer.mozilla.org/docs/Web/JavaScript/Data_structures#string_type)>, [Map](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Map)<[string](https://developer.mozilla.org/docs/Web/JavaScript/Data_structures#string_type) | [number](https://developer.mozilla.org/docs/Web/JavaScript/Data_structures#number_type)>>></code>';

    strictEqual(transformTypeToReferenceLink(input, {}), expected);
  });

  it('should parse functions with array destructuring in callbacks returning functions with object destructuring', () => {
    const input =
      '(cb: ([first, second]: string[]) => void) => ({ id, name }: User) => boolean';

    const expected =
      '<code><(cb: ([first, second]: [string](https://developer.mozilla.org/docs/Web/JavaScript/Data_structures#string_type)[]) => void) => ({ id, name }: [User](userLink)) => [boolean](https://developer.mozilla.org/docs/Web/JavaScript/Data_structures#boolean_type)></code>';

    strictEqual(
      transformTypeToReferenceLink(input, { User: 'userLink' }),
      expected
    );
  });
});
