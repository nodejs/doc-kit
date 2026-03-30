'use strict';

import { SKIP, visit } from 'unist-util-visit';

const languagePrefix = 'language-';

/**
 * Checks if a HAST node is a <pre><code> code block.
 *
 * @param {import('hast').Node} node
 * @returns {boolean}
 */
function isCodeBlock(node) {
  return Boolean(
    node?.tagName === 'pre' && node?.children[0].tagName === 'code'
  );
}

/**
 * Extracts the language identifier from a <code> element's className.
 *
 * @param {import('hast').Element} codeElement
 * @returns {string}
 */
function getLanguage(codeElement) {
  const className = codeElement.properties?.className;

  if (!Array.isArray(className)) {
    return 'text';
  }

  const langClass = className.find(
    c => typeof c === 'string' && c.startsWith(languagePrefix)
  );

  return langClass ? langClass.slice(languagePrefix.length) : 'text';
}

/**
 * A rehype plugin that assigns display names to consecutive code blocks
 * sharing the same language, preventing ambiguous tab labels like "JS | JS".
 *
 * Must run before @node-core/rehype-shiki so that displayName metadata
 * is available when CodeTabs are assembled.
 *
 * @type {import('unified').Plugin}
 */
export default function codeTabs() {
  return function (tree) {
    visit(tree, 'element', (node, index, parent) => {
      if (!parent || index == null || !isCodeBlock(node)) {
        return;
      }

      const group = [];
      let currentIndex = index;

      while (isCodeBlock(parent.children[currentIndex])) {
        group.push(currentIndex);

        const nextNode = parent.children[currentIndex + 1];
        currentIndex += nextNode && nextNode.type === 'text' ? 2 : 1;
      }

      if (group.length < 2) {
        return;
      }

      const languages = group.map(idx =>
        getLanguage(parent.children[idx].children[0])
      );

      const counts = {};
      for (const lang of languages) {
        counts[lang] = (counts[lang] || 0) + 1;
      }

      // If no language appears more than once, rehype-shiki handles it fine
      const hasDuplicates = Object.values(counts).some(c => c > 1);

      if (!hasDuplicates) {
        return;
      }

      // Assign display names like (1), (2) for duplicated languages
      const counters = {};

      for (let i = 0; i < group.length; i++) {
        const lang = languages[i];

        if (counts[lang] < 2) {
          continue;
        }

        counters[lang] = (counters[lang] || 0) + 1;

        const codeElement = parent.children[group[i]].children[0];
        codeElement.data = codeElement.data || {};
        codeElement.data.meta =
          `${codeElement.data.meta || ''} displayName="(${counters[lang]})"`.trim();
      }

      return [SKIP];
    });
  };
}
