// Typed lists, from which doc-kit builds signatures and their tables:
// `- \`name\` {Type} Description. **Default:** \`value\`.`
import { renderDefault, renderParts } from './comments.mjs';
import { renderMemberType, renderType } from './types.mjs';
import { VOID_TYPES } from '../constants.mjs';
import {
  code,
  firstSentence,
  indentContinuation,
  splitFirstParagraph,
} from '../utils/markdown.mjs';
import {
  isDeclaration,
  membersOf,
  objectDeclaration,
} from '../utils/reflections.mjs';

/** The indentation of nested list items */
const NESTED = '  ';

/**
 * Joins the parts of an item that are there.
 *
 * @param {Array<string | undefined>} parts
 */
const joinParts = parts => parts.filter(Boolean).join(' ');

/**
 * The end of an item giving its default. doc-kit reads a `**Default:**` code
 * span as making the item optional; other defaults, and those of `Type:`
 * items (which would read `Type?:`), use `**Default**:`.
 *
 * @param {string | undefined} value
 * @param {boolean} [optional]
 */
const defaultSuffix = (value, optional = false) => {
  if (!value) {
    return '';
  }

  const isCode = /^`[^`]+`$/.test(value);
  const label = optional && isCode ? '**Default:**' : '**Default**:';

  return ` ${label} ${value.replace(/\.$/, '')}.`;
};

/**
 * The `Type:` item of a property or variable.
 *
 * @param {import('./comments.mjs').Context} context
 * @param {import('typedoc').DeclarationReflection} member
 */
export const typeItem = (context, member) => {
  const type = renderMemberType(member.type);
  const { value } = renderDefault(context, member.comment);

  return `- Type: {${type}}${defaultSuffix(value)}`;
};

/**
 * A member with a page of its own, as an item: its type, the first sentence
 * of its description and a link to its page, which holds the rest. Such
 * members are documented once, on their pages, wherever they are listed.
 *
 * @param {import('./comments.mjs').Context} context
 * @param {import('typedoc').DeclarationReflection} member
 * @param {string} [indent]
 */
export const memberPageItem = (context, member, indent = '') => {
  const summary = renderParts(context, member.comment?.summary);

  return joinParts([
    `${indent}- ${code(member.name)}`,
    `{${renderMemberType(member.type)}}`,
    firstSentence(summary),
    `[Details](${context.model.url(member)})`,
  ]);
};

/**
 * The properties a parameter's type documents as nested items: those of an
 * object type, or of a named type with member pages (`InputOptions`).
 *
 * @param {import('./comments.mjs').Context} context
 * @param {import('typedoc').SomeType | undefined} type
 * @returns {import('typedoc').DeclarationReflection[]}
 */
const nestedProperties = ({ model }, type) => {
  const object = objectDeclaration(type);

  if (object) {
    return object.children ?? [];
  }

  const target = type?.type === 'reference' ? type.reflection : undefined;

  if (!isDeclaration(target)) {
    return [];
  }

  const members = membersOf(target);
  const hasMemberPages = members.some(member => model.memberPageOf(member));

  return hasMemberPages ? members : [];
};

/**
 * A parameter's default: its `@default`, or the default of its declaration.
 *
 * @param {import('./comments.mjs').Context} context
 * @param {import('typedoc').ParameterReflection | import('typedoc').DeclarationReflection} parameter
 */
const parameterDefault = (context, parameter) => {
  const { value } = renderDefault(context, parameter.comment);

  if (value) {
    return value;
  }

  const declared = 'defaultValue' in parameter ? parameter.defaultValue : '';

  // TypeDoc writes defaults it can't print as `...`
  return declared && declared !== '...' ? code(declared) : undefined;
};

/**
 * A parameter as an item, with the properties of its type nested. Text past
 * the first paragraph of a description goes to `notes`, shown after the
 * list.
 *
 * @param {import('./comments.mjs').Context} context
 * @param {import('typedoc').ParameterReflection | import('typedoc').DeclarationReflection} parameter
 * @param {{ indent?: string, notes?: string[], path?: string }} [position]
 * @returns {string[]}
 */
export const parameterItems = (
  context,
  parameter,
  { indent = '', notes = [], path = '' } = {}
) => {
  const name = parameter.flags.isRest ? `...${parameter.name}` : parameter.name;
  const summary = renderParts(context, parameter.comment?.summary);
  const [description, extended] = splitFirstParagraph(summary);

  if (extended) {
    notes.push(`**${code(`${path}${parameter.name}`)}:** ${extended}`, '');
  }

  const isObject = Boolean(objectDeclaration(parameter.type));
  const type = isObject ? 'Object' : renderType(parameter.type);

  const line = joinParts([
    `${indent}- ${code(name)}`,
    `{${type}}`,
    description && indentContinuation(description, `${indent}${NESTED}`),
  ]);

  const items = [
    `${line}${defaultSuffix(parameterDefault(context, parameter), true)}`,
  ];

  for (const property of nestedProperties(context, parameter.type)) {
    const page = context.model.memberPageOf(property);

    if (page) {
      items.push(memberPageItem(context, page, `${indent}${NESTED}`));
      continue;
    }

    const nested = parameterItems(context, property, {
      indent: `${indent}${NESTED}`,
      notes,
      path: `${path}${parameter.name}.`,
    });

    items.push(...nested);
  }

  return items;
};

/**
 * A call signature's items: its parameters and return value.
 *
 * @param {import('./comments.mjs').Context} context
 * @param {import('typedoc').SignatureReflection} signature
 * @param {string[]} [notes]
 */
export const signatureItems = (context, signature, notes = []) => {
  const items = [];

  for (const parameter of signature.parameters ?? []) {
    // `this` is the context a function is called with, not a parameter
    if (parameter.name !== 'this') {
      items.push(...parameterItems(context, parameter, { notes }));
    }
  }

  const returns = signature.comment?.getTag('@returns');
  const returnType = renderType(signature.type);

  if (returns || !VOID_TYPES.has(returnType)) {
    const description = returns
      ? ` ${renderParts(context, returns.content)}`
      : '';

    items.push(`- Returns: {${returnType}}${description}`);
  }

  return items;
};
