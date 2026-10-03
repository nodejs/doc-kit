import { ReflectionKind } from 'typedoc';

import { EVENT_EMITTER, WRAPPER_TYPES } from '../constants.mjs';

/**
 * The reflection a re-export refers to.
 *
 * @param {import('typedoc').Reflection} reflection
 */
export const deref = reflection =>
  reflection.isReference() ? reflection.getTargetReflectionDeep() : reflection;

/**
 * The type a utility type wraps (`Readonly<{ … }>`), or the type itself.
 *
 * @param {import('typedoc').SomeType | undefined} type
 * @returns {import('typedoc').SomeType | undefined}
 */
const unwrap = type =>
  type?.type === 'reference' && WRAPPER_TYPES.has(type.name)
    ? unwrap(type.typeArguments?.[0])
    : type;

/**
 * The declaration of an object type (`{ a: string }`), whose properties are
 * documented as entries of their own.
 *
 * @param {import('typedoc').SomeType | undefined} type
 */
export const objectDeclaration = type => {
  const object = unwrap(type);

  if (object?.type !== 'reflection') {
    return undefined;
  }

  const { declaration } = object;
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
 * The call signatures of a function, method, callable interface, or a
 * declaration whose type is one of them.
 *
 * @param {import('typedoc').DeclarationReflection} reflection
 * @returns {import('typedoc').SignatureReflection[]}
 */
export const signaturesOf = reflection => {
  if (reflection.signatures) {
    return reflection.signatures;
  }

  const { type } = reflection;

  if (type?.type === 'reflection') {
    return type.declaration.signatures ?? [];
  }

  const target = type?.type === 'reference' ? type.reflection : undefined;

  return (target?.isDeclaration() && target.signatures) || [];
};

/**
 * The type of a member: its own, or that of its accessors.
 *
 * @param {import('typedoc').DeclarationReflection} member
 */
export const typeOf = member =>
  member.type ??
  member.getSignature?.type ??
  member.setSignature?.parameters?.[0]?.type;

/**
 * The comment of a member: its own, or that of its getter.
 *
 * @param {import('typedoc').DeclarationReflection} member
 */
export const commentOf = member =>
  member.comment ?? member.getSignature?.comment;

/**
 * The members of an interface, class, enum or object type alias.
 *
 * @param {import('typedoc').DeclarationReflection} reflection
 * @returns {import('typedoc').DeclarationReflection[]}
 */
export const membersOf = reflection =>
  reflection.children ?? objectDeclaration(reflection.type)?.children ?? [];

/**
 * A name in camelCase: `InputOptions` → `inputOptions`.
 *
 * @param {string} name
 */
export const camelCase = name => name[0].toLowerCase() + name.slice(1);

/**
 * Whether a declaration is documented as a function: a function, or a
 * variable or type alias of a callable type.
 *
 * @param {import('typedoc').DeclarationReflection} declaration
 */
export const isCallable = declaration =>
  declaration.kindOf(ReflectionKind.Function) ||
  (declaration.kindOf(ReflectionKind.Variable | ReflectionKind.TypeAlias) &&
    signaturesOf(declaration).length > 0);

/**
 * The type mapping an emitter's event names to the arguments of their
 * listeners: `WatcherEvents` for `class Watcher extends EventEmitter<WatcherEvents>`.
 *
 * @param {import('typedoc').DeclarationReflection} declaration
 */
export const eventMapOf = declaration => {
  const emitter = declaration.extendedTypes?.find(
    type => type.type === 'reference' && type.name === EVENT_EMITTER
  );

  const events = emitter?.typeArguments?.[0];
  const target = events?.type === 'reference' ? events.reflection : undefined;

  return target?.isDeclaration() ? target : undefined;
};

/**
 * The `@category` of a reflection.
 *
 * @param {import('typedoc').Reflection} reflection
 */
export const categoryOf = reflection =>
  reflection.parent?.categories?.find(({ children }) =>
    children.includes(reflection)
  )?.title;

/**
 * The entry points exporting each declaration the main entry point (the
 * first) does not export.
 *
 * @param {import('typedoc').ProjectReflection} project
 */
export const secondaryExports = project => {
  const [main, ...others] = project.getChildrenByKind(ReflectionKind.Module);
  const mainExports = new Set(main?.children?.map(deref));

  /** @type {Map<import('typedoc').Reflection, string[]>} */
  const exportedFrom = new Map();

  for (const module of others) {
    for (const declaration of module.children?.map(deref) ?? []) {
      if (!mainExports.has(declaration)) {
        const names = exportedFrom.get(declaration) ?? [];
        exportedFrom.set(declaration, [...names, module.name]);
      }
    }
  }

  return exportedFrom;
};
