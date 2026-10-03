import { ReflectionKind } from 'typedoc';

import { renderDefault, renderParts } from './comments.mjs';
import { STANDARD_TAGS } from '../constants.mjs';
import { code, heading } from '../utils/markdown.mjs';
import { camelCase } from '../utils/reflections.mjs';

/**
 * The name members of a type are documented on: `docKitReceivers`, or the
 * type's name in camelCase (`inputOptions.input`).
 *
 * @param {import('typedoc').Application} app
 * @param {import('typedoc').Reflection} owner
 */
export const receiverOf = (app, owner) =>
  app.options.getValue('docKitReceivers')[owner.name] ?? camelCase(owner.name);

/**
 * The name an entry is documented by: `build` for an export, then
 * `new Watcher`, `Watcher.create`, `watcher.close`, or
 * `buildOptions.output.dir` for the members of a type, and
 * `buildOptions.treeshake.annotations` for those of a type documented on a
 * member's page.
 *
 * @param {import('../utils/router.mjs').DocKitRouter} router
 * @param {import('typedoc').Reflection} reflection
 * @returns {string}
 */
export const entryName = (router, reflection) => {
  // The members of an object type belong to what has that type
  const parent = reflection.parent?.kindOf(ReflectionKind.TypeLiteral)
    ? reflection.parent.parent
    : reflection.parent;

  if (!parent || parent.kindOf(ReflectionKind.ExportContainer)) {
    return reflection.name;
  }

  if (reflection.kindOf(ReflectionKind.Constructor)) {
    return `new ${parent.name}`;
  }

  const isStatic =
    reflection.flags.isStatic || reflection.kindOf(ReflectionKind.EnumMember);

  if (isStatic) {
    return `${parent.name}.${reflection.name}`;
  }

  const documentedOn = router.inlined.get(parent);

  if (documentedOn) {
    return `${entryName(router, documentedOn)}.${reflection.name}`;
  }

  const isOwner = parent.parent?.kindOf(ReflectionKind.ExportContainer);

  const receiver = isOwner
    ? receiverOf(router.application, parent)
    : entryName(router, parent);

  return `${receiver}.${reflection.name}`;
};

/**
 * A parameter's name, spread when it is a rest parameter.
 *
 * @param {import('typedoc').ParameterReflection} parameter
 */
export const parameterLabel = parameter =>
  parameter.flags.isRest ? `...${parameter.name}` : parameter.name;

/**
 * A call signature's parameters, apart from the `this` it is called with.
 *
 * @param {import('typedoc').SignatureReflection} signature
 */
export const splitThis = signature => {
  const all = signature.parameters ?? [];

  return {
    thisParameter: all.find(({ name }) => name === 'this'),
    parameters: all.filter(({ name }) => name !== 'this'),
  };
};

/**
 * Whether a parameter can be left out of a call.
 *
 * @param {import('typedoc').ParameterReflection} parameter
 */
const isOptional = parameter =>
  Boolean(
    parameter.flags.isOptional ||
    parameter.flags.isRest ||
    parameter.defaultValue
  );

/**
 * A call in doc-kit's signature syntax: `rolldown(input)`,
 * `bundle.write([outputOptions])`.
 *
 * @param {string} name
 * @param {import('typedoc').SignatureReflection} signature
 */
export const callHeading = (name, signature) => {
  let params = '';
  let open = 0;

  for (const [index, parameter] of splitThis(signature).parameters.entries()) {
    const separator = index ? ', ' : '';
    const label = parameterLabel(parameter);

    // Optional parameters open brackets, closed by the next required one
    if (isOptional(parameter)) {
      params += `[${separator}${label}`;
      open++;
    } else {
      params += `${']'.repeat(open)}${separator}${label}`;
      open = 0;
    }
  }

  return code(`${name}(${params}${']'.repeat(open)})`);
};

/**
 * The heading of an entry: its call, when given a signature, or its name.
 *
 * @param {import('../utils/router.mjs').DocKitRouter} router
 * @param {import('typedoc').Reflection} reflection
 * @param {import('typedoc').SignatureReflection} [signature]
 */
export const entryHeading = (router, reflection, signature) => {
  const name = entryName(router, reflection);

  if (!signature) {
    return code(name);
  }

  const call = callHeading(name, signature);

  return reflection.flags.isStatic ? `Static method: ${call}` : call;
};

/**
 * The YAML block of an entry: the page title, on a page's own heading, and
 * the source link. Sources are relative to TypeDoc's `basePath`; those of
 * external declarations are left out.
 *
 * @param {import('typedoc').Reflection} reflection
 * @param {import('typedoc').SignatureReflection | undefined} signature
 * @param {string | undefined} title
 */
const yamlBlock = (reflection, signature, title) => {
  const fields = [];

  // A signature declared elsewhere (a callable interface's) is not this entry's source
  const ownSignature = signature?.parent === reflection ? signature : undefined;
  const source = ownSignature?.sources?.[0] ?? reflection.sources?.[0];

  if (title) {
    fields.push(`title: ${JSON.stringify(title)}`);
  }

  if (source && !reflection.flags.isExternal) {
    fields.push(`source_link: ${source.fileName}#L${source.line}`);
  }

  return fields.length ? ['<!-- YAML', ...fields, '-->', ''] : [];
};

/**
 * The stability index of an entry, from `@deprecated` or `@experimental`.
 *
 * @param {import('../types').Context} context
 * @param {import('typedoc').Comment | undefined} comment
 */
const stabilityIndex = (context, comment) => {
  const deprecated = comment?.getTag('@deprecated');

  if (deprecated) {
    const message = renderParts(context, deprecated.content);
    const quoted = message.replaceAll('\n', '\n> ');

    return [`> Stability: 0 - Deprecated${quoted ? `: ${quoted}` : ''}`, ''];
  }

  if (comment?.hasModifier('@experimental')) {
    return ['> Stability: 1 - Experimental', ''];
  }

  return [];
};

/**
 * A block tag of the project's own (`@kind async`), as `**Kind:** async`.
 *
 * @param {string} tag
 * @param {string} content
 */
const customTag = (tag, content) =>
  `**${tag[1].toUpperCase()}${tag.slice(2)}:** ${content}`;

/**
 * The lines of a block tag, following an entry's description.
 *
 * @param {import('../types').Context} context
 * @param {import('typedoc').Comment} comment
 * @param {import('typedoc').CommentTag} tag
 * @param {number} depth The depth of the entry's heading
 */
const blockTag = (context, comment, tag, depth) => {
  const content = renderParts(context, tag.content);

  switch (tag.tag) {
    case '@see':
      return [`See ${content}`, ''];

    case '@throws':
      return [`**Throws:** ${content}`, ''];

    case '@example':
      return [heading(depth + 1, 'Example'), '', content, ''];

    case '@default':
    case '@defaultValue': {
      // A default that is more than a value has a section of its own
      const { more } = renderDefault(context, comment);

      return more ? [heading(depth + 1, 'Default'), '', more, ''] : [];
    }

    default:
      return STANDARD_TAGS.has(tag.tag)
        ? []
        : [customTag(tag.tag, content), ''];
  }
};

/**
 * An entry: its heading, then the source link, stability index and typed
 * list doc-kit reads as its metadata, then its description, the notes
 * following it, and its block tags.
 *
 * @param {import('../types').Context} context
 * @param {object} entry
 * @param {number} entry.depth
 * @param {string} entry.label The heading's text
 * @param {import('typedoc').Reflection} entry.reflection
 * @param {import('typedoc').Comment} [entry.comment]
 * @param {import('typedoc').SignatureReflection} [entry.signature]
 * @param {string[]} [entry.items] The typed list
 * @param {string} [entry.title] The page title, on a page's own heading
 * @param {string[]} [entry.notes] Text following the description
 * @returns {string[]}
 */
export const renderEntry = (
  context,
  {
    depth,
    label,
    reflection,
    comment,
    signature,
    items = [],
    title,
    notes = [],
  }
) => {
  const lines = [heading(depth, label), ''];

  lines.push(...yamlBlock(reflection, signature, title));
  lines.push(...stabilityIndex(context, comment));

  if (items.length) {
    lines.push(...items, '');
  }

  const summary = renderParts(context, comment?.summary);

  if (summary) {
    lines.push(summary, '');
  }

  if (notes.length) {
    lines.push(...notes, '');
  }

  for (const tag of comment?.blockTags ?? []) {
    lines.push(...blockTag(context, comment, tag, depth));
  }

  return lines;
};
