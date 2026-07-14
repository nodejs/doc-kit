'use strict';

// A backslash escape before ASCII punctuation (CommonMark's escapable set).
// The tokenizer captures the raw source, so legacy escapes like `{string\[]}`
// and the mandatory `\|` inside GFM table cells must be decoded here.
const CHARACTER_ESCAPE = /\\([!-/:-@[-`{-~])/g;

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
      this.enter({ type: 'typeAnnotation', value: '' }, token);
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

      // Chunks are split by interior line endings; re-join with a space
      node.value = node.value ? `${node.value} ${chunk}` : chunk;
    },
    /**
     * @this {import('mdast-util-from-markdown').CompileContext}
     * @param {import('micromark-util-types').Token} token
     */
    typeAnnotation(token) {
      const node = this.stack.at(-1);

      node.value = node.value
        .replace(/\s+/g, ' ')
        .trim()
        .replace(CHARACTER_ESCAPE, '$1');

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
     */
    typeAnnotation: node => `{${node.value}}`,
  },
});
