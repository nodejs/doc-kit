'use strict';

import { endianness } from 'node:os';

import createHighlighter from '@node-core/rehype-shiki';
import { h as createElement } from 'hastscript';
import { visit } from 'unist-util-visit';

import shikiConfig from '../../shiki.config.mjs';

const languagePrefix = 'language-';

/**
 * Creates a toolbar element with a language label and copy button.
 *
 * @param {string} languageId
 * @returns {import('hast').Element}
 */
function createToolbarElement(languageId) {
  return createElement('div', { class: 'code-toolbar' }, [
    createElement('span', { class: 'code-language' }, languageId),
    createElement('button', { class: 'copy-button' }, 'copy'),
  ]);
}

/**
 * Checks if a node is a code block.
 *
 * @param {import('unist').Node} node
 * @returns {boolean}
 */
function isCodeBlock(node) {
  return Boolean(
    node?.type === 'element' &&
    node.tagName === 'pre' &&
    node.children?.[0]?.type === 'element' &&
    node.children[0].tagName === 'code'
  );
}

/**
 * Converts a markdown code block into a Shiki highlighted block.
 *
 * @param {import('hast').Element} node
 * @returns {import('hast').Element[] | null}
 */
function highlightCodeBlock(node) {
  const codeElement = node.children[0];

  const classNames = codeElement.properties?.className;

  if (!Array.isArray(classNames) || classNames.length === 0) {
    return null;
  }

  const languageClass = classNames.find(
    c => typeof c === 'string' && c.startsWith(languagePrefix)
  );

  if (!languageClass) {
    return null;
  }

  const languageId = languageClass.slice(languagePrefix.length);

  const { children } = highlighter.shiki.codeToHast(
    codeElement.children[0]?.value ?? '',
    {
      lang: languageId,
      themes: {
        light: shikiConfig.themes[0],
        dark: shikiConfig.themes[1],
      },
    }
  );

  children[0].properties.class = `${children[0].properties.class} ${languageClass}`;

  children[0].children.push(createToolbarElement(languageId));

  return children;
}

/**
 * Converts adjacent CJS/MJS blocks into a switchable block.
 *
 * @param {import('hast').Element[]} children
 */
function createCodeTabs(children) {
  for (let index = 0; index < children.length - 1; index++) {
    const first = children[index];
    const second = children[index + 1];

    if (!isCodeBlock(first) || !isCodeBlock(second)) {
      continue;
    }

    const firstLanguage = getLanguage(first);
    const secondLanguage = getLanguage(second);

    if (
      !isSupportedFlavor(firstLanguage) ||
      !isSupportedFlavor(secondLanguage)
    ) {
      continue;
    }

    if (firstLanguage === secondLanguage) {
      continue;
    }

    const firstCode = first.children[0];
    const secondCode = second.children[0];

    firstCode.properties.class = `${first.properties.class} ${firstLanguage}`;

    secondCode.properties.class = `${second.properties.class} ${secondLanguage}`;

    firstCode.properties.language = firstLanguage;
    secondCode.properties.language = secondLanguage;

    const switchable = createElement(
      'pre',
      {
        class: 'shiki',
        style: first.properties.style,
      },
      [
        createElement('input', {
          class: 'js-flavor-toggle',
          type: 'checkbox',
          checked: firstLanguage === 'cjs',
        }),
        firstCode,
        secondCode,
        createToolbarElement('javascript'),
      ]
    );

    children.splice(index, 2, switchable);
  }
}

/**
 * Gets the language from a highlighted pre element.
 *
 * @param {import('hast').Element} node
 * @returns {string}
 */
function getLanguage(node) {
  const className = node.properties?.class;

  if (typeof className !== 'string') {
    return 'text';
  }

  return (
    className.match(/language-(?<language>.*)/)?.groups?.language ?? 'text'
  );
}

/**
 * @param {string} language
 */
function isSupportedFlavor(language) {
  return language === 'cjs' || language === 'mjs';
}

export const highlighter = await createHighlighter({
  wasm: process.arch !== 'riscv64' && endianness() === 'LE',
});

/**
 * @deprecated Use @node-core/rehype-shiki directly instead.
 *
 * @type {import('unified').Plugin}
 */
export default function rehypeShikiji() {
  return function (tree) {
    visit(tree, 'element', node => {
      if (!node.children?.length) {
        return;
      }

      node.children = node.children.flatMap(child => {
        if (child.type !== 'element' || child.tagName !== 'pre') {
          return [child];
        }

        return highlightCodeBlock(child) ?? [child];
      });

      createCodeTabs(node.children);
    });
  };
}
