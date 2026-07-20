'use strict';

// A backslash escape before ASCII punctuation (CommonMark's escapable set).
// The tokenizer captures the raw source, so legacy escapes like `{string\[]}`
// and the mandatory `\|` inside GFM table cells must be decoded here.
const CHARACTER_ESCAPE = /\\([!-/:-@[-`{-~])/g;

// Interior line endings are normalized to a single space.
const WHITESPACE = /\s+/g;

/**
 * Normalizes the parsed type text into its canonical form.
 *
 * @param {string} value
 * @returns {string}
 */
const normalizeTypeAnnotation = value =>
  value.replace(WHITESPACE, ' ').trim().replace(CHARACTER_ESCAPE, '$1');

/**
 * Creates the mdast-util-from-markdown extension that compiles
 * `typeAnnotation` tokens into `{ type: 'typeAnnotation', value }` nodes.
 *
 * The stored `value` is the canonical, single-line, unescaped TypeScript type
 * text; link offsets computed later are relative to it.
 *
 * @returns {import('mdast-util-from-markdown').Extension}
 */
export const typeAnnotationFromMarkdown = () => ({
  enter: {
    /**
     * @this {import('mdast-util-from-markdown').CompileContext}
     * @param {import('micromark-util-types').Token} token
     */
    typeAnnotation(token) {
      this.enter(
        {
          type: 'typeAnnotation',
          value: '',
        },
        token
      );
    },
  },

  exit: {
    /**
     * @this {import('mdast-util-from-markdown').CompileContext}
     * @param {import('micromark-util-types').Token} token
     */
    typeAnnotationValue(token) {
      const node = this.stack.at(-1);
      const chunk = this.sliceSerialize(token);

      node.value += node.value ? ` ${chunk}` : chunk;
    },

    /**
     * @this {import('mdast-util-from-markdown').CompileContext}
     * @param {import('micromark-util-types').Token} token
     */
    typeAnnotation(token) {
      const node = this.stack.at(-1);

      node.value = normalizeTypeAnnotation(node.value);

      this.exit(token);
    },
  },
});

/**
 * Creates the mdast-util-to-markdown extension that serializes
 * `typeAnnotation` nodes back to their `{...}` source form.
 *
 * @returns {import('mdast-util-to-markdown').Options}
 */
export const typeAnnotationToMarkdown = () => ({
  handlers: {
    /**
     * @param {{ value: string }} node
     * @returns {string}
     */
    typeAnnotation: ({ value }) => `{${value}}`,
  },
});
