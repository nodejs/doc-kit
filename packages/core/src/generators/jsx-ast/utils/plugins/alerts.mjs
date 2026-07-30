'use strict';

import { SKIP, visit } from 'unist-util-visit';

import { JSX_IMPORTS } from '../../../web/constants.mjs';
import { ALERT_MARKER, GITHUB_ALERT_TYPES } from '../../constants.mjs';
import { createJSXElement } from '../ast.mjs';

/**
 * Converts a marker keyword into a human-readable title (e.g. `NOTE` -> `Note`).
 * @param {string} type - The uppercase alert keyword
 */
const toTitle = type => type[0] + type.slice(1).toLowerCase();

/**
 * @param {import('mdast').Root} tree
 */
const transformer = tree => {
  visit(tree, 'blockquote', (node, index, parent) => {
    // The marker must be the leading text of the blockquote's first paragraph
    const paragraph = node.children[0];

    if (paragraph?.type !== 'paragraph') {
      return;
    }

    const text = paragraph.children[0];

    if (text?.type !== 'text') {
      return;
    }

    const match = text.value.match(ALERT_MARKER);

    if (!match) {
      return;
    }

    // Strip the marker (and its trailing line break) from the leading text,
    // dropping the now-empty text node — and its paragraph — if nothing remains.
    text.value = text.value.slice(match[0].length);

    if (text.value === '') {
      paragraph.children.shift();
    }

    if (paragraph.children.length === 0) {
      node.children.shift();
    }

    parent.children[index] = createJSXElement(JSX_IMPORTS.AlertBox.name, {
      inline: false,
      children: node.children,
      level: GITHUB_ALERT_TYPES[match[1]],
      title: toTitle(match[1]),
    });

    // Skip the (now detached) blockquote's children, but revisit this index so
    // the new AlertBox is descended into, allowing nested alerts to transform.
    return [SKIP, index];
  });
};

/**
 * Remark plugin that rewrites GitHub-style alert blockquotes into AlertBox
 * components.
 *
 * @example
 * > [!NOTE]
 * > Highlights information that users should take into account.
 *
 * @see https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax#alerts
 */
export default () => transformer;
