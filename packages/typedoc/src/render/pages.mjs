// Pages: one per export, and one per member with a page of its own
// (`docKitMemberPages`).
import { ReflectionKind } from 'typedoc';

import { callHeading, renderPreamble, renderProse } from './entries.mjs';
import { signatureItems, typeItem } from './lists.mjs';
import {
  receiverOf,
  renderEvents,
  renderMember,
  renderMembers,
} from './members.mjs';
import { renderType } from './types.mjs';
import { code } from '../utils/markdown.mjs';
import {
  nestedObject,
  objectDeclaration,
  signaturesOf,
} from '../utils/reflections.mjs';

/**
 * A declaration's page title: `Interface: InputOptions`, `Function: build()`.
 *
 * @param {import('typedoc').DeclarationReflection} declaration
 */
export const pageTitle = declaration => {
  // `TypeAlias` → `Type Alias`
  const kind = ReflectionKind[declaration.kind].replace(
    /(?<=[a-z])(?=[A-Z])/g,
    ' '
  );

  const call = declaration.kindOf(ReflectionKind.Function) ? '()' : '';

  return `${kind}: ${declaration.name}${call}`;
};

/**
 * Where an export is imported from, unless from the main entry point (the
 * shortest import path of `docKitImportPaths`).
 *
 * @param {import('./comments.mjs').Context} context
 * @param {import('typedoc').DeclarationReflection} declaration
 */
const importedFrom = ({ model, options }, declaration) => {
  const allPaths = Object.values(options.docKitImportPaths);
  const [main] = allPaths.sort((a, b) => a.length - b.length);
  const paths = [...(model.importPaths.get(declaration) ?? [])];

  if (!paths.length || paths.includes(main)) {
    return [];
  }

  return [`Exported from ${paths.map(code).join(', ')}.`];
};

/**
 * The types extending an interface, linked through their annotations.
 *
 * @param {import('typedoc').DeclarationReflection} declaration
 */
const extendedBy = declaration => {
  const names = (declaration.extendedBy ?? []).map(({ name }) => `{${name}}`);

  return names.length ? [`Extended by ${names.join(', ')}.`] : [];
};

/**
 * The entry of a function's signature. The page's own entry carries the page
 * title and where the function is imported from.
 *
 * @param {import('./comments.mjs').Context} context
 * @param {import('typedoc').DeclarationReflection} declaration
 * @param {import('typedoc').SignatureReflection} signature
 * @param {number} depth
 */
const signatureEntry = (context, declaration, signature, depth) => {
  const isPage = depth === 1;
  const comment = signature.comment ?? declaration.comment;

  const notes = [];
  const items = signatureItems(context, signature, notes);

  if (isPage) {
    notes.push(...importedFrom(context, declaration));
  }

  const lines = [
    `${'#'.repeat(depth)} ${callHeading(declaration.name, signature)}`,
    '',
  ];

  lines.push(
    ...renderPreamble(context, {
      reflection: declaration,
      comment,
      items,
      signature,
      title: isPage ? pageTitle(declaration) : undefined,
    })
  );
  lines.push(...renderProse(context, comment, depth, notes));

  return lines;
};

/**
 * A function, or a variable or type alias of a function type. A single
 * signature is the page's own entry; several are entries under its title.
 *
 * @param {import('./comments.mjs').Context} context
 * @param {import('typedoc').DeclarationReflection} declaration
 */
const callablePage = (context, declaration) => {
  const signatures = signaturesOf(declaration);

  if (signatures.length === 1) {
    return signatureEntry(context, declaration, signatures[0], 1);
  }

  const title = pageTitle(declaration);
  const { comment } = declaration;
  const lines = [`# ${title}`, ''];

  lines.push(
    ...renderPreamble(context, { reflection: declaration, comment, title })
  );
  lines.push(
    ...renderProse(context, comment, 1, importedFrom(context, declaration))
  );

  for (const signature of signatures) {
    lines.push(...signatureEntry(context, declaration, signature, 2));
  }

  return lines;
};

/**
 * The typed list of a type: what a type alias stands for, or what an
 * interface extends.
 *
 * @param {import('typedoc').DeclarationReflection} declaration
 */
const typeItems = declaration => {
  const isAlias =
    declaration.kindOf(ReflectionKind.TypeAlias) &&
    declaration.type &&
    !objectDeclaration(declaration.type);

  if (isAlias) {
    return [`- Type: {${renderType(declaration.type)}}`];
  }

  const extended = declaration.extendedTypes ?? [];

  return extended.length
    ? [`- Extends: {${extended.map(renderType).join(' & ')}}`]
    : [];
};

/**
 * An interface, class or type alias, with its events and members.
 *
 * @param {import('./comments.mjs').Context} context
 * @param {import('typedoc').DeclarationReflection} declaration
 */
const typePage = (context, declaration) => {
  const heading = declaration.kindOf(ReflectionKind.Class)
    ? `Class: ${code(declaration.name)}`
    : pageTitle(declaration);

  const { comment } = declaration;
  const notes = importedFrom(context, declaration).concat(
    extendedBy(declaration)
  );
  const lines = [`# ${heading}`, ''];

  lines.push(
    ...renderPreamble(context, {
      reflection: declaration,
      comment,
      items: typeItems(declaration),
      title: pageTitle(declaration),
    })
  );
  lines.push(...renderProse(context, comment, 1, notes));
  lines.push(...renderEvents(context, declaration, 2));
  lines.push(
    ...renderMembers(context, declaration, receiverOf(context, declaration), 2)
  );

  return lines;
};

/**
 * A variable that is not a function.
 *
 * @param {import('./comments.mjs').Context} context
 * @param {import('typedoc').DeclarationReflection} declaration
 */
const variablePage = (context, declaration) => {
  const title = pageTitle(declaration);
  const { comment } = declaration;
  const items = [`- Type: {${renderType(declaration.type)}}`];
  const lines = [`# ${title}`, ''];

  lines.push(
    ...renderPreamble(context, {
      reflection: declaration,
      comment,
      items,
      title,
    })
  );
  lines.push(
    ...renderProse(context, comment, 1, importedFrom(context, declaration))
  );

  return lines;
};

/**
 * A type documented on the page of the one member page using it: a pointer
 * there.
 *
 * @param {import('./comments.mjs').Context} context
 * @param {import('typedoc').DeclarationReflection} declaration
 * @param {import('typedoc').DeclarationReflection} member
 */
const inlinedTypePage = (context, declaration, member) => {
  const name = code(`${receiverOf(context, member.parent)}.${member.name}`);

  return [
    `# ${pageTitle(declaration)}`,
    '',
    `See [${name}](${context.model.url(member)}).`,
  ];
};

/**
 * The type a member page documents the members of: a type no other member
 * page uses.
 *
 * @param {import('./comments.mjs').Context} context
 * @param {import('typedoc').DeclarationReflection} member
 */
const inlinedTypeOf = ({ model }, member) => {
  for (const [type, user] of model.inlined) {
    if (user === member) {
      return type;
    }
  }

  return undefined;
};

/**
 * A member with a page of its own, with the members of its type (an object
 * type, or a type documented on this page only).
 *
 * @param {import('./comments.mjs').Context} context
 * @param {import('typedoc').DeclarationReflection} member
 */
export const memberPage = (context, member) => {
  const receiver = receiverOf(context, member.parent);
  const { comment } = member;
  const items = [typeItem(context, member)];
  const lines = [`# ${code(`${receiver}.${member.name}`)}`, ''];

  lines.push(
    ...renderPreamble(context, {
      reflection: member,
      comment,
      items,
      title: member.name,
    })
  );
  lines.push(...renderProse(context, comment, 1));

  const inlined = inlinedTypeOf(context, member);

  if (inlined) {
    lines.push(...renderMembers(context, inlined, member.name, 2));
  }

  for (const child of nestedObject(member.type)?.children ?? []) {
    lines.push(...renderMember(context, child, member.name, 2));
  }

  return lines;
};

/**
 * Whether a declaration is documented as a function: a function, or a
 * variable or type alias of a function type.
 *
 * @param {import('typedoc').DeclarationReflection} declaration
 */
const isCallable = declaration =>
  declaration.kindOf(ReflectionKind.Function) ||
  (declaration.kindOf(ReflectionKind.Variable | ReflectionKind.TypeAlias) &&
    signaturesOf(declaration).length > 0);

/**
 * The page of an export.
 *
 * @param {import('./comments.mjs').Context} context
 * @param {import('typedoc').DeclarationReflection} declaration
 */
export const declarationPage = (context, declaration) => {
  const member = context.model.inlined.get(declaration);

  if (member) {
    return inlinedTypePage(context, declaration, member);
  }

  if (isCallable(declaration)) {
    return callablePage(context, declaration);
  }

  if (declaration.kindOf(ReflectionKind.Variable)) {
    return variablePage(context, declaration);
  }

  return typePage(context, declaration);
};
