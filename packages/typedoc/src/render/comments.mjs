import { BARE_VALUE, SINGLE_LINE_FENCE } from '../constants.mjs';
import { code } from '../utils/markdown.mjs';

/**
 * A part of a comment as Markdown: text as it is, `{@link}` and
 * `{@linkcode}` tags as links.
 *
 * @param {import('../types').Context} context
 * @param {import('typedoc').CommentDisplayPart} part
 */
const renderPart = ({ router, page }, part) => {
  if (part.kind !== 'inline-tag') {
    return part.text;
  }

  const text = part.tag === '@linkcode' ? code(part.text) : part.text;
  const target =
    typeof part.target === 'object' && 'variant' in part.target
      ? router.linkTo(page, part.target)
      : part.target;

  return typeof target === 'string' ? `[${text}](${target})` : text;
};

/**
 * Comment text as Markdown.
 *
 * @param {import('../types').Context} context
 * @param {readonly import('typedoc').CommentDisplayPart[]} [parts]
 */
export const renderParts = (context, parts = []) =>
  parts
    .map(part => renderPart(context, part))
    .join('')
    .trim();

/**
 * A comment's summary, split into its short form (its `@summary`, or its
 * first paragraph) and the rest of it.
 *
 * @param {import('../types').Context} context
 * @param {import('typedoc').Comment | undefined} comment
 * @returns {[string, string]}
 */
export const splitSummary = (context, comment) => {
  const summary = renderParts(context, comment?.summary);
  const short = renderParts(context, comment?.getShortSummary(true));

  return summary.startsWith(short)
    ? [short, summary.slice(short.length).trim()]
    : [short, summary];
};

/**
 * A `@default`: a value that fits after a type (a word, a sentence, or a
 * one-line code block), or documentation of its own.
 *
 * @param {import('../types').Context} context
 * @param {import('typedoc').Comment | undefined} comment
 * @returns {{ value?: string, more?: string }}
 */
export const renderDefault = (context, comment) => {
  const tag = comment?.getTag('@default') ?? comment?.getTag('@defaultValue');

  if (!tag) {
    return {};
  }

  const markdown = renderParts(context, tag.content);
  const value = markdown.replace(SINGLE_LINE_FENCE, (_, line) => code(line));

  if (value.includes('\n')) {
    return { more: markdown };
  }

  return { value: BARE_VALUE.test(value) ? code(value) : value };
};
