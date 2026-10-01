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
  text.replace(/\n(?=.)/g, `\n${indent}`);

/**
 * A heading of the given depth, at most `######`.
 *
 * @param {number} depth
 * @param {string} text
 */
export const heading = (depth, text) =>
  `${'#'.repeat(Math.min(depth, 6))} ${text}`;

/**
 * Splits Markdown into its first paragraph and the rest (code blocks, lists
 * and further paragraphs). Markdown opening with a block other than a
 * paragraph has no first paragraph to split off.
 *
 * @param {string} markdown
 * @returns {[string, string]}
 */
export const splitFirstParagraph = markdown => {
  if (/^(```|~~~|<)/.test(markdown)) {
    return ['', markdown];
  }

  const end = /\n\s*\n/.exec(markdown);

  if (!end || /^(>|- |\* |\d+\. )/.test(markdown)) {
    return [markdown, ''];
  }

  return [markdown.slice(0, end.index), markdown.slice(end.index).trim()];
};

/**
 * The first sentence of Markdown's first paragraph, on one line.
 *
 * @param {string} markdown
 */
export const firstSentence = markdown => {
  const [paragraph] = splitFirstParagraph(markdown);
  const line = paragraph.replace(/\s+/g, ' ').trim();

  return /^.+?[.!?](?=\s|$)/.exec(line)?.[0] ?? line;
};
