import { code } from '../utils/markdown.mjs';

/**
 * What every renderer works with: the model, the options, and the root the
 * source links are relative to.
 *
 * @typedef {{ model: import('../types').Model, options: import('../types').Options, root: string }} Context
 */

/**
 * Where an inline tag links to: a URL, or the page of a reflection.
 *
 * @param {Context} context
 * @param {import('typedoc').InlineTagDisplayPart} part
 */
const linkTarget = ({ model }, part) => {
  if (typeof part.target === 'string') {
    return part.target;
  }

  const isReflection = part.target && 'variant' in part.target;

  return isReflection ? model.url(part.target) : undefined;
};

/**
 * A part of a comment as Markdown: text as it is, `{@link}` and
 * `{@linkcode}` tags as links.
 *
 * @param {Context} context
 * @param {import('typedoc').CommentDisplayPart} part
 */
const renderPart = (context, part) => {
  if (part.kind !== 'inline-tag') {
    return part.text;
  }

  const text = part.tag === '@linkcode' ? code(part.text) : part.text;
  const target = linkTarget(context, part);

  return target ? `[${text}](${target})` : text;
};

/**
 * Comment text as Markdown, with absolute links into the site made relative.
 *
 * @param {Context} context
 * @param {readonly import('typedoc').CommentDisplayPart[]} [parts]
 */
export const renderParts = (context, parts = []) => {
  const markdown = parts.map(part => renderPart(context, part)).join('');
  const siteUrl = context.options.docKitSiteUrl;

  if (!siteUrl) {
    return markdown.trim();
  }

  return markdown.replaceAll(`](${siteUrl}/`, '](/').trim();
};

/**
 * Where the first part of a `@default` ends: after a code block, which is a
 * value as a whole, or after the first paragraph.
 *
 * @param {string} markdown
 */
const firstPartEnd = markdown =>
  markdown.startsWith('```')
    ? markdown.indexOf('\n```', 3) + 4
    : markdown.search(/\n\s*\n|$/);

/**
 * A `@default`, split into what fits after a type (a value, a sentence, or a
 * list of values joined into one) and the documentation following it. A
 * default that does not fit is all documentation.
 *
 * @param {Context} context
 * @param {import('typedoc').Comment | undefined} comment
 * @returns {{ value?: string, more?: string }}
 */
export const renderDefault = (context, comment) => {
  const tag = comment?.getTag('@default') ?? comment?.getTag('@defaultValue');

  if (!tag) {
    return {};
  }

  const markdown = renderParts(context, tag.content);
  const end = firstPartEnd(markdown);
  const more = markdown.slice(end).trim();

  // A one-line code block is a value in a code span
  const first = markdown
    .slice(0, end)
    .trim()
    .replace(/^```\w*\n([^\n]*)\n```$/, (_, value) => code(value));

  if (!first.includes('\n')) {
    // A bare value (`@default 'es'`) is code
    const isBare = /^[^\s`]+$/.test(first);

    return { value: isBare ? code(first) : first, more };
  }

  const items = first.split('\n');
  const isList = items.every(item => item.startsWith('- '));

  if (!isList) {
    return { more: markdown };
  }

  const values = items.map(item => item.slice(2));

  return { value: values.join('; '), more };
};
