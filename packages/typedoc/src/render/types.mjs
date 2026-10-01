import { nestedObject, objectDeclaration } from '../utils/reflections.mjs';

/**
 * A type as a TypeScript type expression, for a `{Type}` annotation. Type
 * parameters show their constraint: `keyof EventMap` for
 * `E extends keyof EventMap`.
 *
 * @param {import('typedoc').SomeType | undefined} type
 * @returns {string}
 */
export const renderType = type => {
  if (type?.type === 'reference' && type.refersToTypeParameter) {
    const constraint = type.reflection?.type;

    if (constraint) {
      return renderType(constraint);
    }
  }

  return (type?.toString() ?? 'unknown').replace(/\s+/g, ' ');
};

/**
 * Like `renderType()`, with object types shown as `Object`: their properties
 * are documented as entries of their own.
 *
 * @param {import('typedoc').SomeType | undefined} type
 */
export const renderMemberType = type => {
  if (objectDeclaration(type)) {
    return 'Object';
  }

  if (type?.type === 'union' && nestedObject(type)) {
    return type.types
      .map(part => (objectDeclaration(part) ? 'Object' : renderType(part)))
      .join(' | ');
  }

  return renderType(type);
};
