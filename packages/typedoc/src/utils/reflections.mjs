// Questions about TypeDoc reflections and types. They check TypeDoc's
// discriminants (`variant`, `type`) rather than using `instanceof`, so they
// hold when the plugin and the host load different copies of TypeDoc.

/**
 * The reflection a re-export refers to.
 *
 * @param {import('typedoc').Reflection} reflection
 */
export const deref = reflection =>
  reflection?.variant === 'reference'
    ? reflection.getTargetReflectionDeep()
    : reflection;

/**
 * Whether a reflection is a declaration (a function, class, property, …).
 *
 * @param {import('typedoc').Reflection | undefined} reflection
 */
export const isDeclaration = reflection =>
  reflection?.variant === 'declaration';

/**
 * The declaration of an object type (`{ a: string }`), whose properties are
 * documented as entries of their own.
 *
 * @param {import('typedoc').SomeType | undefined} type
 */
export const objectDeclaration = type => {
  if (type?.type !== 'reflection') {
    return undefined;
  }

  const { declaration } = type;
  const isObject =
    !declaration.signatures?.length && declaration.children?.length;

  return isObject ? declaration : undefined;
};

/**
 * The object type a type is or includes (`boolean | { … }`).
 *
 * @param {import('typedoc').SomeType | undefined} type
 */
export const nestedObject = type => {
  if (type?.type !== 'union') {
    return objectDeclaration(type);
  }

  const objects = type.types.map(objectDeclaration).filter(Boolean);

  return objects.length === 1 ? objects[0] : undefined;
};

/**
 * The call signatures of a function, method or function-typed member.
 *
 * @param {import('typedoc').DeclarationReflection} reflection
 * @returns {import('typedoc').SignatureReflection[]}
 */
export const signaturesOf = reflection => {
  if (reflection.signatures) {
    return reflection.signatures;
  }

  const type = reflection.type;

  return type?.type === 'reflection' ? (type.declaration.signatures ?? []) : [];
};

/**
 * Whether a member is part of its type's public API.
 *
 * @param {import('typedoc').DeclarationReflection} member
 */
const isPublic = member =>
  !member.flags.isPrivate && !member.name.startsWith('#');

/**
 * The public members of an interface, class or object type alias.
 *
 * @param {import('typedoc').DeclarationReflection} reflection
 * @returns {import('typedoc').DeclarationReflection[]}
 */
export const membersOf = reflection => {
  const members =
    reflection.children ?? objectDeclaration(reflection.type)?.children ?? [];

  return members.filter(isPublic);
};

/**
 * The anchor a member gets with `docKitMemberAnchors`: its name alone.
 *
 * @param {import('typedoc').Reflection} member
 */
export const memberAnchor = member =>
  member.name.toLowerCase().replace(/[_$]+/g, '-').replace(/^-|-$/g, '');

/**
 * A name in camelCase: `InputOptions` → `inputOptions`.
 *
 * @param {string} name
 */
export const camelCase = name => name[0].toLowerCase() + name.slice(1);

/**
 * The type a type stands for, unwrapping `Partial<T>`.
 *
 * @param {import('typedoc').SomeType | undefined} type
 */
const unwrapPartial = type =>
  type?.type === 'reference' && type.name === 'Partial'
    ? type.typeArguments?.[0]
    : type;

/**
 * Whether a type refers to a declaration of the project.
 *
 * @param {import('typedoc').SomeType | undefined} type
 */
const refersToDeclaration = type =>
  type?.type === 'reference' && isDeclaration(type.reflection);

/**
 * The single declaration a type refers to, alone, in a union
 * (`boolean | TreeshakingOptions`) or made `Partial`.
 *
 * @param {import('typedoc').SomeType | undefined} type
 */
export const referencedDeclaration = type => {
  const types = type?.type === 'union' ? type.types : [type];
  const references = types.map(unwrapPartial).filter(refersToDeclaration);

  return references.length === 1 ? references[0].reflection : undefined;
};
