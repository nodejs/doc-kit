// The parts of an entry: after its heading, the source link, stability index
// and typed list doc-kit reads as its metadata, then its documentation.
import { relative } from 'node:path';

import { renderDefault, renderParts } from './comments.mjs';
import { STANDARD_TAGS } from '../constants.mjs';
import { code, heading } from '../utils/markdown.mjs';

/**
 * Where an entry is declared: its signature's source, or its own. Sources in
 * dependencies are left out; they are not part of the project.
 *
 * @param {import('typedoc').DeclarationReflection} reflection
 * @param {import('typedoc').SignatureReflection} [signature]
 */
const sourceOf = (reflection, signature) => {
  const candidates = [signature?.sources?.[0], reflection.sources?.[0]];

  return candidates.find(
    source => source && !source.fullFileName.includes('/node_modules/')
  );
};

/**
 * The YAML block of an entry: the page title, on a page's own heading, and
 * the source link.
 *
 * @param {import('./comments.mjs').Context} context
 * @param {import('typedoc').SourceReference | undefined} source
 * @param {string} [title]
 */
const yamlBlock = (context, source, title) => {
  const fields = [];

  if (title) {
    fields.push(`title: ${JSON.stringify(title)}`);
  }

  if (source) {
    const file = relative(context.root, source.fullFileName).replaceAll(
      '\\',
      '/'
    );

    fields.push(`source_link: ${file}#L${source.line}`);
  }

  if (!fields.length) {
    return [];
  }

  return ['<!-- YAML', fields.join('\n'), '-->', ''];
};

/**
 * The stability index of an entry, from `@deprecated` or `@experimental`.
 *
 * @param {import('./comments.mjs').Context} context
 * @param {import('typedoc').Comment | undefined} comment
 */
const stabilityIndex = (context, comment) => {
  const deprecated = comment?.getTag('@deprecated');

  if (deprecated) {
    const message = renderParts(context, deprecated.content);
    const quoted = message.replace(/\n/g, '\n> ');

    return [`> Stability: 0 - Deprecated${quoted ? `: ${quoted}` : ''}`, ''];
  }

  if (comment?.hasModifier('@experimental')) {
    return ['> Stability: 1 - Experimental', ''];
  }

  return [];
};

/**
 * The source link, stability index and typed list opening an entry, in
 * doc-kit's syntax.
 *
 * @param {import('./comments.mjs').Context} context
 * @param {object} entry
 * @param {import('typedoc').DeclarationReflection} entry.reflection
 * @param {import('typedoc').Comment} [entry.comment]
 * @param {string[]} [entry.items] The typed list
 * @param {import('typedoc').SignatureReflection} [entry.signature]
 * @param {string} [entry.title] The page title, on a page's own heading
 */
export const renderPreamble = (
  context,
  { reflection, comment, items = [], signature, title }
) => {
  const source = sourceOf(reflection, signature);

  const lines = yamlBlock(context, source, title);

  lines.push(...stabilityIndex(context, comment));

  if (items.length) {
    lines.push(...items, '');
  }

  return lines;
};

/**
 * A block tag of the project's own (`@kind async`), as `**Kind:** async`.
 *
 * @param {string} tag
 * @param {string} content
 */
const customTag = (tag, content) => {
  const name = tag.slice(1);

  return `**${name[0].toUpperCase()}${name.slice(1)}:** ${content}`;
};

/**
 * The lines of a block tag, following an entry's description.
 *
 * @param {import('./comments.mjs').Context} context
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
      // What follows the default given with the type, or a default that
      // needs a section of its own
      const { value, more } = renderDefault(context, comment);

      if (!more) {
        return [];
      }

      return value ? [more, ''] : [heading(depth + 1, 'Default'), '', more, ''];
    }

    default:
      return STANDARD_TAGS.has(tag.tag)
        ? []
        : [customTag(tag.tag, content), ''];
  }
};

/**
 * An entry's documentation: its description, then its block tags (examples,
 * references, errors, defaults needing more than a value, and the project's
 * own tags).
 *
 * @param {import('./comments.mjs').Context} context
 * @param {import('typedoc').Comment | undefined} comment
 * @param {number} depth The depth of the entry's heading
 * @param {string[]} [extra] Text following the description
 */
export const renderProse = (context, comment, depth, extra = []) => {
  const lines = [];
  const summary = renderParts(context, comment?.summary);

  if (summary) {
    lines.push(summary, '');
  }

  if (extra.length) {
    lines.push(...extra, '');
  }

  for (const tag of comment?.blockTags ?? []) {
    lines.push(...blockTag(context, comment, tag, depth));
  }

  return lines;
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
 * The heading of a callable entry, in doc-kit's signature syntax:
 * `rolldown(input)`, `bundle.write([outputOptions])`.
 *
 * @param {string} name
 * @param {import('typedoc').SignatureReflection} signature
 */
export const callHeading = (name, signature) => {
  let params = '';
  let open = 0;

  const parameters = (signature.parameters ?? []).filter(
    parameter => parameter.name !== 'this'
  );

  for (const [index, parameter] of parameters.entries()) {
    const label = parameter.flags.isRest
      ? `...${parameter.name}`
      : parameter.name;

    const separator = index ? ', ' : '';

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
