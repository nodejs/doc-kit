// Typed lists, from which doc-kit builds signatures and their tables:
// `- \`name\` {Type} Description. **Default:** \`value\`.`
import { renderDefault, renderParts, splitSummary } from './comments.mjs';
import { parameterLabel, splitThis } from './entries.mjs';
import { renderMemberType, renderType } from './types.mjs';
import {
  CODE_SPAN,
  NESTED_INDENT,
  TRAILING_PERIOD,
  VOID_TYPES,
} from '../constants.mjs';
import { code, firstSentence, indentContinuation } from '../utils/markdown.mjs';
import {
  commentOf,
  membersOf,
  nestedObject,
  typeOf,
} from '../utils/reflections.mjs';

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

  const label =
    optional && CODE_SPAN.test(value) ? '**Default:**' : '**Default**:';

  return ` ${label} ${value.replace(TRAILING_PERIOD, '')}.`;
};

/**
 * The `Type:` item of a property, variable or type alias.
 *
 * @param {import('../types').Context} context
 * @param {import('typedoc').DeclarationReflection} reflection
 */
export const typeItem = (context, reflection) => {
  const type = renderMemberType(typeOf(reflection));
  const { value } = renderDefault(context, commentOf(reflection));

  return `- Type: {${type}}${defaultSuffix(value)}`;
};

/**
 * A member with a page of its own, as an item: its type, the first sentence
 * of its description and a link to its page, which holds the rest.
 *
 * @param {import('../types').Context} context
 * @param {import('typedoc').DeclarationReflection} member
 * @param {string} [indent]
 */
export const memberPageItem = (context, member, indent = '') => {
  const [summary] = splitSummary(context, commentOf(member));

  return joinParts([
    `${indent}- ${code(member.name)}`,
    `{${renderMemberType(typeOf(member))}}`,
    firstSentence(summary),
    `[Details](${context.router.linkTo(context.page, member)})`,
  ]);
};

/**
 * The properties a parameter's type documents as nested items: those of an
 * object type (alone or in a union), or of a named type with member pages
 * (`InputOptions`).
 *
 * @param {import('../types').Context} context
 * @param {import('typedoc').SomeType | undefined} type
 * @returns {import('typedoc').DeclarationReflection[]}
 */
const nestedProperties = ({ router }, type) => {
  const object = nestedObject(type);

  if (object) {
    return object.children ?? [];
  }

  const target = type?.type === 'reference' ? type.reflection : undefined;

  if (!target?.isDeclaration()) {
    return [];
  }

  const members = membersOf(target);
  const hasMemberPages = members.some(member => router.memberPageOf(member));

  return hasMemberPages ? members : [];
};

/**
 * A parameter's default: its `@default`, or the default of its declaration.
 *
 * @param {import('../types').Context} context
 * @param {import('typedoc').ParameterReflection} parameter
 */
const parameterDefault = (context, parameter) => {
  const { value } = renderDefault(context, parameter.comment);

  if (value) {
    return value;
  }

  // TypeDoc writes defaults it can't print as `...`
  const declared = parameter.defaultValue;

  return declared && declared !== '...' ? code(declared) : undefined;
};

/**
 * A parameter as an item, with the properties of its type nested. Text past
 * the short summary of a description goes to `notes`, shown after the list.
 *
 * @param {import('../types').Context} context
 * @param {Pick<import('typedoc').ParameterReflection, 'name' | 'type' | 'flags' | 'comment' | 'defaultValue'>} parameter
 * @param {{ indent?: string, notes?: string[], path?: string }} [position]
 * @returns {string[]}
 */
export const parameterItems = (
  context,
  parameter,
  { indent = '', notes = [], path = '' } = {}
) => {
  const [description, extended] = splitSummary(context, parameter.comment);

  if (extended) {
    notes.push(`**${code(`${path}${parameter.name}`)}:** ${extended}`, '');
  }

  const line = joinParts([
    `${indent}- ${code(parameterLabel(parameter))}`,
    `{${renderMemberType(parameter.type)}}`,
    description && indentContinuation(description, `${indent}${NESTED_INDENT}`),
  ]);

  const items = [
    `${line}${defaultSuffix(parameterDefault(context, parameter), true)}`,
  ];

  for (const property of nestedProperties(context, parameter.type)) {
    const page = context.router.memberPageOf(property);

    items.push(
      ...(page
        ? [memberPageItem(context, page, `${indent}${NESTED_INDENT}`)]
        : parameterItems(context, property, {
            indent: `${indent}${NESTED_INDENT}`,
            notes,
            path: `${path}${parameter.name}.`,
          }))
    );
  }

  return items;
};

/**
 * A call signature's items: its parameters and return value.
 *
 * @param {import('../types').Context} context
 * @param {import('typedoc').SignatureReflection} signature
 * @param {string[]} [notes]
 */
export const signatureItems = (context, signature, notes = []) => {
  const items = splitThis(signature).parameters.flatMap(parameter =>
    parameterItems(context, parameter, { notes })
  );

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
