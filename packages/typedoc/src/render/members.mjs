// The members of a type, and the events of an emitter, as entries of its
// page.
import { ReflectionKind } from 'typedoc';

import { entryHeading, renderEntry, splitThis } from './entries.mjs';
import {
  memberPageItem,
  parameterItems,
  signatureItems,
  typeItem,
} from './lists.mjs';
import { renderType } from './types.mjs';
import { code, heading } from '../utils/markdown.mjs';
import {
  commentOf,
  eventMapOf,
  membersOf,
  nestedObject,
  objectDeclaration,
  signaturesOf,
  typeOf,
} from '../utils/reflections.mjs';

/**
 * What a page's own entry carries besides the entry itself.
 *
 * @typedef {{ title?: string, notes?: string[] }} PageExtras
 */

/**
 * The entry of a call signature, of a function or a method.
 *
 * @param {import('../types').Context} context
 * @param {import('typedoc').DeclarationReflection} declaration
 * @param {import('typedoc').SignatureReflection} signature
 * @param {number} depth
 * @param {PageExtras} [extras]
 */
export const renderSignature = (
  context,
  declaration,
  signature,
  depth,
  { title, notes: extraNotes = [] } = {}
) => {
  const notes = [];
  const items = signatureItems(context, signature, notes);
  const { thisParameter } = splitThis(signature);

  // The type of `this` in a function, as a note
  if (thisParameter) {
    notes.push(`**Context:** {${renderType(thisParameter.type)}}`, '');
  }

  return renderEntry(context, {
    depth,
    label: entryHeading(context.app, declaration, signature),
    reflection: declaration,
    comment: signature.comment ?? declaration.comment,
    signature,
    items,
    title,
    notes: [...notes, ...extraNotes],
  });
};

/**
 * The entry of a property, with the properties of an object type nested.
 *
 * @param {import('../types').Context} context
 * @param {import('typedoc').DeclarationReflection} member
 * @param {number} depth
 * @param {PageExtras} [extras]
 */
const renderProperty = (context, member, depth, extras = {}) => {
  const lines = renderEntry(context, {
    depth,
    label: entryHeading(context.app, member),
    reflection: member,
    comment: commentOf(member),
    items: [typeItem(context, member)],
    ...extras,
  });

  for (const child of nestedObject(typeOf(member))?.children ?? []) {
    lines.push(...renderMember(context, child, depth + 1));
  }

  return lines;
};

/**
 * A member as an entry: a method, with an entry per signature, or a
 * property.
 *
 * @param {import('../types').Context} context
 * @param {import('typedoc').DeclarationReflection} member
 * @param {number} depth
 * @param {PageExtras} [extras]
 * @returns {string[]}
 */
export const renderMember = (context, member, depth, extras) => {
  const signatures = signaturesOf(member);

  if (!signatures.length) {
    return renderProperty(context, member, depth, extras);
  }

  return signatures.flatMap(signature =>
    renderSignature(context, member, signature, depth, extras)
  );
};

/**
 * Whether a type groups its members with `@group`: TypeDoc names its own
 * groups after the kind of their members.
 *
 * @param {Array<import('typedoc').ReflectionGroup>} groups
 */
const hasCustomGroups = groups =>
  groups.some(({ title, children }) =>
    children.some(child => ReflectionKind.pluralString(child.kind) !== title)
  );

/**
 * The members of a type. Members with pages of their own are listed, linking
 * to them; the others are entries, in sections when grouped with `@group`.
 *
 * @param {import('../types').Context} context
 * @param {import('typedoc').DeclarationReflection} owner
 * @param {number} depth
 */
export const renderMembers = (context, owner, depth) => {
  const lines = [];
  const all = membersOf(owner);
  const pages = all.map(member => context.router.memberPageOf(member));
  const members = all.filter((_, index) => !pages[index]);

  if (pages.some(Boolean)) {
    lines.push(heading(depth, 'Properties'), '');
    lines.push(
      ...pages.filter(Boolean).map(page => memberPageItem(context, page)),
      ''
    );
  }

  const groups = owner.groups ?? objectDeclaration(owner.type)?.groups ?? [];

  if (!hasCustomGroups(groups)) {
    return lines.concat(
      members.flatMap(member => renderMember(context, member, depth))
    );
  }

  for (const { title, children } of groups) {
    lines.push(heading(depth, title), '');
    lines.push(
      ...children
        .filter(member => members.includes(member))
        .flatMap(member => renderMember(context, member, depth + 1))
    );
  }

  return lines;
};

/**
 * The arguments an event's listeners receive, as a typed list.
 *
 * @param {import('../types').Context} context
 * @param {import('typedoc').DeclarationReflection} event
 */
const eventArguments = (context, event) => {
  const elements = event.type?.type === 'tuple' ? event.type.elements : [];

  return elements
    .filter(element => element.type === 'namedTupleMember')
    .flatMap(({ name, element, isOptional }) =>
      parameterItems(context, { name, type: element, flags: { isOptional } })
    );
};

/**
 * An emitter's events, as doc-kit `Event:` entries listing the arguments
 * their listeners receive, from its event map (see `eventMapOf()`).
 *
 * @param {import('../types').Context} context
 * @param {import('typedoc').DeclarationReflection} emitter
 * @param {number} depth
 */
export const renderEvents = (context, emitter, depth) => {
  const eventMap = eventMapOf(emitter);

  return (eventMap ? membersOf(eventMap) : []).flatMap(event =>
    renderEntry(context, {
      depth,
      label: `Event: ${code(`'${event.name}'`)}`,
      reflection: event,
      comment: event.comment,
      items: eventArguments(context, event),
    })
  );
};
