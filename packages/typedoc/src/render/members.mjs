// The members of a type, and the events of an emitter, as entries of its
// page.
import { ReflectionKind } from 'typedoc';

import { callHeading, renderPreamble, renderProse } from './entries.mjs';
import {
  memberPageItem,
  parameterItems,
  signatureItems,
  typeItem,
} from './lists.mjs';
import { renderType } from './types.mjs';
import { DEFAULT_GROUPS } from '../constants.mjs';
import { code, heading } from '../utils/markdown.mjs';
import {
  camelCase,
  memberAnchor,
  membersOf,
  nestedObject,
  objectDeclaration,
  signaturesOf,
} from '../utils/reflections.mjs';

/**
 * The name members of a type are documented on: `docKitReceivers`, or the
 * type's name in camelCase (`inputOptions.input`).
 *
 * @param {import('./comments.mjs').Context} context
 * @param {import('typedoc').DeclarationReflection} owner
 */
export const receiverOf = ({ options }, owner) =>
  options.docKitReceivers[owner.name] ?? camelCase(owner.name);

/**
 * The signatures of a member: its own, or those of the member of the same
 * name of its type's `docKitSignatureSources` type.
 *
 * @param {import('./comments.mjs').Context} context
 * @param {import('typedoc').DeclarationReflection} member
 */
const memberSignatures = ({ model, options }, member) => {
  const sourceName = options.docKitSignatureSources[member.parent?.name ?? ''];
  const source = model.byName.get(sourceName);
  const sourceMember = source?.children?.find(
    ({ name }) => name === member.name
  );

  return signaturesOf(sourceMember ?? member);
};

/**
 * The name a method is called by: `new Watcher`, `Watcher.create`,
 * `watcher.close`.
 *
 * @param {import('typedoc').DeclarationReflection} member
 * @param {string} receiver
 */
const methodName = (member, receiver) => {
  if (member.kindOf(ReflectionKind.Constructor)) {
    return `new ${member.parent.name}`;
  }

  const owner = member.flags.isStatic ? member.parent.name : receiver;

  return `${owner}.${member.name}`;
};

/**
 * The entry of a method's signature.
 *
 * @param {import('./comments.mjs').Context} context
 * @param {import('typedoc').DeclarationReflection} member
 * @param {import('typedoc').SignatureReflection} signature
 * @param {string} receiver
 * @param {number} depth
 */
const renderSignature = (context, member, signature, receiver, depth) => {
  const comment = signature.comment ?? member.comment;
  const call = callHeading(methodName(member, receiver), signature);
  const title = member.flags.isStatic ? `Static method: ${call}` : call;

  const notes = [];
  const items = signatureItems(context, signature, notes);

  // The type of `this` in a function, as a note
  const thisParameter = signature.parameters?.find(
    ({ name }) => name === 'this'
  );

  if (thisParameter) {
    notes.push(`**Context:** {${renderType(thisParameter.type)}}`, '');
  }

  const lines = [heading(depth, title), ''];

  lines.push(
    ...renderPreamble(context, {
      reflection: member,
      comment,
      items,
      signature,
    })
  );
  lines.push(...renderProse(context, comment, depth, notes));

  return lines;
};

/**
 * The entry of a property, with the properties of an object type nested.
 *
 * @param {import('./comments.mjs').Context} context
 * @param {import('typedoc').DeclarationReflection} member
 * @param {string} receiver
 * @param {number} depth
 */
const renderProperty = (context, member, receiver, depth) => {
  const path = `${receiver}.${member.name}`;
  const items = [typeItem(context, member)];
  const lines = [heading(depth, code(path)), ''];

  lines.push(
    ...renderPreamble(context, {
      reflection: member,
      comment: member.comment,
      items,
    })
  );
  lines.push(...renderProse(context, member.comment, depth));

  for (const child of nestedObject(member.type)?.children ?? []) {
    lines.push(...renderMember(context, child, path, depth + 1));
  }

  return lines;
};

/**
 * A member of an interface, class or object type, as an entry of its owner's
 * page: a method, with an entry per signature, or a property.
 *
 * @param {import('./comments.mjs').Context} context
 * @param {import('typedoc').DeclarationReflection} member
 * @param {string} receiver
 * @param {number} depth
 * @returns {string[]}
 */
export const renderMember = (context, member, receiver, depth) => {
  const lines = [];

  if (context.options.docKitMemberAnchors) {
    lines.push(`<div id="${memberAnchor(member)}"></div>`, '');
  }

  const signatures = memberSignatures(context, member);

  if (!signatures.length) {
    lines.push(...renderProperty(context, member, receiver, depth));

    return lines;
  }

  for (const signature of signatures) {
    lines.push(...renderSignature(context, member, signature, receiver, depth));
  }

  return lines;
};

/**
 * Whether a type groups its members with `@group`.
 *
 * @param {Array<import('typedoc').ReflectionGroup>} groups
 */
const hasCustomGroups = groups =>
  groups.some(({ title }) => !DEFAULT_GROUPS.has(title));

/**
 * The members of a type. Members with pages of their own are listed, linking
 * to them; the others are entries, in sections when grouped with `@group`.
 *
 * @param {import('./comments.mjs').Context} context
 * @param {import('typedoc').DeclarationReflection} owner
 * @param {string} receiver
 * @param {number} depth
 */
export const renderMembers = (context, owner, receiver, depth) => {
  const lines = [];
  const pages = [];
  const members = [];

  for (const member of membersOf(owner)) {
    const page = context.model.memberPageOf(member);

    if (page) {
      pages.push(page);
    } else {
      members.push(member);
    }
  }

  if (pages.length) {
    lines.push(heading(depth, 'Properties'), '');

    for (const page of pages) {
      lines.push(memberPageItem(context, page));
    }

    lines.push('');
  }

  const groups = owner.groups ?? objectDeclaration(owner.type)?.groups ?? [];

  if (!hasCustomGroups(groups)) {
    for (const member of members) {
      lines.push(...renderMember(context, member, receiver, depth));
    }

    return lines;
  }

  for (const { title, children } of groups) {
    lines.push(heading(depth, title), '');

    for (const member of children) {
      if (members.includes(member)) {
        lines.push(...renderMember(context, member, receiver, depth + 1));
      }
    }
  }

  return lines;
};

/**
 * The arguments an event's listeners receive, as a typed list.
 *
 * @param {import('./comments.mjs').Context} context
 * @param {import('typedoc').DeclarationReflection} event
 */
const eventArguments = (context, event) => {
  const items = [];
  const elements = event.type?.type === 'tuple' ? event.type.elements : [];

  for (const argument of elements) {
    if (argument?.type !== 'namedTupleMember') {
      continue;
    }

    const object = objectDeclaration(argument.element);
    const type = object ? 'Object' : renderType(argument.element);

    items.push(`- ${code(argument.name)} {${type}}`);

    for (const property of object?.children ?? []) {
      items.push(...parameterItems(context, property, { indent: '  ' }));
    }
  }

  return items;
};

/**
 * An emitter's events, as doc-kit `Event:` entries listing the arguments
 * their listeners receive (`docKitEvents`).
 *
 * @param {import('./comments.mjs').Context} context
 * @param {import('typedoc').DeclarationReflection} emitter
 * @param {number} depth
 */
export const renderEvents = (context, emitter, depth) => {
  const eventMap = context.model.byName.get(
    context.options.docKitEvents[emitter.name]
  );

  const lines = [];

  for (const event of eventMap ? membersOf(eventMap) : []) {
    lines.push(heading(depth, `Event: ${code(`'${event.name}'`)}`), '');
    lines.push(...eventArguments(context, event), '');
    lines.push(...renderProse(context, event.comment, depth));
  }

  return lines;
};
