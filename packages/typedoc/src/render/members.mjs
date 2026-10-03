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
import { ANCHOR_SEPARATORS, EDGE_HYPHENS } from '../constants.mjs';
import { code, heading } from '../utils/markdown.mjs';
import {
  commentOf,
  eventMapOf,
  membersOf,
  nestedObject,
  objectDeclaration,
  referencedType,
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
    label: entryHeading(context.router, declaration, signature),
    reflection: declaration,
    comment: signature.comment ?? declaration.comment,
    signature,
    items,
    title,
    notes: [...notes, ...extraNotes],
  });
};

/**
 * The members documented under a property: those of its object type, or of
 * the type documented on its page (`TreeshakeOptions` on `treeshake`'s).
 *
 * @param {import('../types').Context} context
 * @param {import('typedoc').DeclarationReflection} member
 */
const nestedMembers = ({ router }, member) => {
  const type = typeOf(member);
  const named = referencedType(type);

  if (named && router.inlined.get(named) === member) {
    return membersOf(named);
  }

  return nestedObject(type)?.children ?? [];
};

/**
 * The entry of a property, with the members of its type nested.
 *
 * @param {import('../types').Context} context
 * @param {import('typedoc').DeclarationReflection} member
 * @param {number} depth
 * @param {PageExtras} [extras]
 */
const renderProperty = (context, member, depth, extras = {}) => {
  const lines = renderEntry(context, {
    depth,
    label: entryHeading(context.router, member),
    reflection: member,
    comment: commentOf(member),
    items: [typeItem(context, member)],
    ...extras,
  });

  for (const child of nestedMembers(context, member)) {
    lines.push(...renderMember(context, child, depth + 1));
  }

  return lines;
};

/**
 * The anchor of a member's name alone (`#resolveid`), besides doc-kit's anchor
 * of its heading: links keep working when its signature changes.
 *
 * @param {import('typedoc').DeclarationReflection} member
 */
const nameAnchor = member => {
  const id = member.name
    .toLowerCase()
    .replace(ANCHOR_SEPARATORS, '-')
    .replace(EDGE_HYPHENS, '');

  return [`<div id="${id}"></div>`, ''];
};

/**
 * A member as an entry, after the anchor of its name on its owner's page: a
 * method, with an entry per signature, or a property.
 *
 * @param {import('../types').Context} context
 * @param {import('typedoc').DeclarationReflection} member
 * @param {number} depth
 * @param {PageExtras} [extras]
 * @returns {string[]}
 */
export const renderMember = (context, member, depth, extras) => {
  const signatures = signaturesOf(member);

  const entries = signatures.length
    ? signatures.flatMap(signature =>
        renderSignature(context, member, signature, depth, extras)
      )
    : renderProperty(context, member, depth, extras);

  // A member with a page of its own is linked to the page
  const anchor = member === context.page ? [] : nameAnchor(member);

  return anchor.concat(entries);
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
