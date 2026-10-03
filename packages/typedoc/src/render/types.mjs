import { TRUNCATED_TYPE, TRUNCATION, WHITESPACE } from '../constants.mjs';
import {
  nestedObject,
  objectDeclaration,
  typeOf,
} from '../utils/reflections.mjs';

/**
 * A type as a TypeScript type expression, for a `{Type}` annotation. Type
 * parameters show their constraint: `keyof EventMap` for
 * `E extends keyof EventMap`. The parts TypeDoc stopped converting are
 * `unknown`, keeping the expression valid TypeScript.
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

  return (type?.toString() ?? 'unknown')
    .replace(WHITESPACE, ' ')
    .replace(TRUNCATED_TYPE, match =>
      match === TRUNCATION ? 'unknown' : match
    );
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

/**
 * A call signature as a function type: `(level?: number) => string`.
 *
 * @param {import('typedoc').SignatureReflection} signature
 */
const renderFunctionType = signature => {
  const parameters = (signature.parameters ?? []).map(parameter => {
    const rest = parameter.flags.isRest ? '...' : '';
    const optional = parameter.flags.isOptional ? '?' : '';

    return `${rest}${parameter.name}${optional}: ${renderType(parameter.type)}`;
  });

  return `(${parameters.join(', ')}) => ${renderType(signature.type)}`;
};

/**
 * The type of a parameter, property, accessor or method, for a `{Type}`
 * annotation. A method's type is the function type of its signatures.
 *
 * @param {import('typedoc').DeclarationReflection | import('typedoc').ParameterReflection} reflection
 */
export const renderDeclarationType = reflection => {
  const type = typeOf(reflection);
  const signatures = reflection.signatures ?? [];

  if (type || !signatures.length) {
    return renderMemberType(type);
  }

  const functions = signatures.map(renderFunctionType);

  // Overloads are the intersection of their function types
  return functions.length === 1
    ? functions[0]
    : functions.map(fn => `(${fn})`).join(' & ');
};
