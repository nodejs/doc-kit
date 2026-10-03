// Pages: one per module, namespace and export, and one per member with a page
// of its own (`docKitMemberPages`).
import { ReflectionKind } from 'typedoc';

import { code, firstSentence, heading } from '../utils/markdown.mjs';
import {
  commentOf,
  deref,
  isCallable,
  objectDeclaration,
  signaturesOf,
} from '../utils/reflections.mjs';
import { splitSummary } from './comments.mjs';
import { entryName, renderEntry } from './entries.mjs';
import { typeItem } from './lists.mjs';
import {
  renderEvents,
  renderMember,
  renderMembers,
  renderSignature,
} from './members.mjs';
import { renderType } from './types.mjs';

/**
 * A reflection's page title: `Interface: InputOptions`, `Function: build()`.
 *
 * @param {import('typedoc').Reflection} reflection
 */
const pageTitle = reflection => {
  const kind = ReflectionKind.singularString(reflection.kind);
  const call = reflection.kindOf(ReflectionKind.Function) ? '()' : '';

  return `${kind}: ${reflection.name}${call}`;
};

/**
 * Where an export is imported from, when the main entry point does not
 * export it.
 *
 * @param {import('../types').Context} context
 * @param {import('typedoc').Reflection} declaration
 */
const importedFrom = ({ exportedFrom }, declaration) => {
  const modules = exportedFrom.get(declaration);

  return modules ? [`Exported from ${modules.map(code).join(', ')}.`] : [];
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
 * A page's own entry.
 *
 * @param {import('../types').Context} context
 * @param {import('typedoc').DeclarationReflection} reflection
 * @param {{ label?: string, items?: string[], notes?: string[] }} [entry]
 */
const pageEntry = (context, reflection, entry = {}) =>
  renderEntry(context, {
    depth: 1,
    label: pageTitle(reflection),
    reflection,
    comment: reflection.comment,
    title: pageTitle(reflection),
    notes: importedFrom(context, reflection),
    ...entry,
  });

/**
 * A type documented on the page of the member using it: its description, and
 * a link there.
 *
 * @param {import('../types').Context} context
 * @param {import('typedoc').DeclarationReflection} declaration
 * @param {import('typedoc').DeclarationReflection} member
 */
const inlinedTypePage = (context, declaration, member) => {
  const name = code(entryName(context.router, member));
  const link = context.router.linkTo(context.page, member);

  return pageEntry(context, declaration, {
    notes: [
      ...importedFrom(context, declaration),
      `Documented with [${name}](${link}).`,
    ],
  });
};

/**
 * A module or namespace: a list of its exports, by group.
 *
 * @param {import('../types').Context} context
 * @param {import('typedoc').DeclarationReflection} container
 */
const containerPage = (context, container) => {
  const lines = pageEntry(context, container);

  for (const { title, children } of container.groups ?? []) {
    lines.push(heading(2, title), '');

    for (const child of children) {
      // A re-export links to what it exports
      const target = deref(child);
      const [summary] = splitSummary(context, commentOf(target));
      const link = `[${code(child.name)}](${context.router.linkTo(context.page, target)})`;

      lines.push(`- ${link} ${firstSentence(summary)}`.trim());
    }

    lines.push('');
  }

  return lines;
};

/**
 * A function, or a variable or type alias of a callable type. A single
 * signature is the page's own entry; several are entries under its title.
 *
 * @param {import('../types').Context} context
 * @param {import('typedoc').DeclarationReflection} declaration
 */
const callablePage = (context, declaration) => {
  const signatures = signaturesOf(declaration);

  if (signatures.length === 1) {
    return renderSignature(context, declaration, signatures[0], 1, {
      title: pageTitle(declaration),
      notes: importedFrom(context, declaration),
    });
  }

  return [
    ...pageEntry(context, declaration),
    ...signatures.flatMap(signature =>
      renderSignature(context, declaration, signature, 2)
    ),
  ];
};

/**
 * The typed list of a type: what a type alias stands for, or what an
 * interface extends.
 *
 * @param {import('../types').Context} context
 * @param {import('typedoc').DeclarationReflection} declaration
 */
const typeItems = (context, declaration) => {
  if (
    declaration.kindOf(ReflectionKind.TypeAlias) &&
    !objectDeclaration(declaration.type)
  ) {
    return [typeItem(context, declaration)];
  }

  const extended = declaration.extendedTypes ?? [];

  return extended.length
    ? [`- Extends: {${extended.map(renderType).join(' & ')}}`]
    : [];
};

/**
 * A class, interface, enum or type alias, with its call signatures, events
 * and members.
 *
 * @param {import('../types').Context} context
 * @param {import('typedoc').DeclarationReflection} declaration
 */
const typePage = (context, declaration) => [
  ...pageEntry(context, declaration, {
    // doc-kit recognizes classes by their `Class: \`Name\`` heading
    label: declaration.kindOf(ReflectionKind.Class)
      ? `Class: ${code(declaration.name)}`
      : pageTitle(declaration),
    items: typeItems(context, declaration),
    notes: [...importedFrom(context, declaration), ...extendedBy(declaration)],
  }),
  ...(declaration.signatures ?? []).flatMap(signature =>
    renderSignature(context, declaration, signature, 2)
  ),
  ...renderEvents(context, declaration, 2),
  ...renderMembers(context, declaration, 2),
];

/**
 * The page of a module, namespace, export or member with a page of its own.
 *
 * @param {import('../types').Context} context
 * @param {import('typedoc').DeclarationReflection} reflection
 * @returns {string[]}
 */
export const renderPage = (context, reflection) => {
  const member = context.router.inlined.get(reflection);

  if (member) {
    return inlinedTypePage(context, reflection, member);
  }

  if (reflection.kindOf(ReflectionKind.SomeModule)) {
    return containerPage(context, reflection);
  }

  if (reflection.kindOf(ReflectionKind.SomeMember)) {
    return renderMember(context, reflection, 1, { title: reflection.name });
  }

  if (isCallable(reflection)) {
    return callablePage(context, reflection);
  }

  if (reflection.kindOf(ReflectionKind.Variable)) {
    return pageEntry(context, reflection, {
      items: [typeItem(context, reflection)],
    });
  }

  return typePage(context, reflection);
};
