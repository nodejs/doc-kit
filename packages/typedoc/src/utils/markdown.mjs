import {
  BLANK_LINES,
  FIRST_SENTENCE,
  LINE_CONTINUATION,
  WHITESPACE,
} from '../constants.mjs';

/**
 * Text as a Markdown code span, with longer delimiters when it holds a
 * backtick.
 *
 * @param {string} text
 */
export const code = text =>
  text.includes('`') ? `\`\` ${text} \`\`` : `\`${text}\``;

/**
 * Indents every line after the first, so multi-line text continues a list
 * item.
 *
 * @param {string} text
 * @param {string} indent
 */
export const indentContinuation = (text, indent) =>
  text.replace(LINE_CONTINUATION, `\n${indent}`);

/**
 * A heading of the given depth, at most `######`.
 *
 * @param {number} depth
 * @param {string} text
 */
export const heading = (depth, text) =>
  `${'#'.repeat(Math.min(depth, 6))} ${text}`;

/**
 * The first sentence of a paragraph, on one line.
 *
 * @param {string} paragraph
 */
export const firstSentence = paragraph => {
  const line = paragraph.replace(WHITESPACE, ' ').trim();

  return FIRST_SENTENCE.exec(line)?.[0] ?? line;
};

/**
 * A page's lines as a Markdown file: no runs of blank lines, one final
 * newline.
 *
 * @param {string[]} lines
 */
export const toMarkdown = lines =>
  `${lines.join('\n').replace(BLANK_LINES, '\n\n').trim()}\n`;
