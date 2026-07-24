'use strict';

import { SKIP, visit } from 'unist-util-visit';

import { JSX_IMPORTS } from '../../../web/constants.mjs';
import { ALERT_MARKER, GITHUB_ALERT_TYPES } from '../../constants.mjs';
import { createJSXElement } from '../ast.mjs';

/**
 * Converts a marker keyword into a human-readable title.
 *
 * Example:
 * NOTE -> Note
 *
 * @param {string} type
 * @returns {string}
 */
const toTitle = type => type[0] + type.slice(1).toLowerCase();

/**
 * @param {import('mdast').Root} tree
 */
const transformer = tree => {
  visit(tree, 'blockquote', (node, index, parent) => {
    /**
     * Only root-level replacements need a parent.
     */
    if (!parent || index === undefined) {
      return;
    }

    const children = node.children;
    const paragraph = children[0];

    /**
     * GitHub alerts must start with a paragraph.
     */
    if (paragraph?.type !== 'paragraph') {
      return;
    }

    const paragraphChildren = paragraph.children;
    const firstChild = paragraphChildren[0];

    /**
     * The marker must be plain text.
     */
    if (firstChild?.type !== 'text') {
      return;
    }

    const match = ALERT_MARKER.exec(firstChild.value);

    if (!match) {
      return;
    }

    /**
     * Remove the alert marker.
     *
     * Example:
     *
     * "[!NOTE]\nhello"
     *
     * becomes:
     *
     * "hello"
     */
    firstChild.value = firstChild.value.slice(match[0].length);

    /**
     * Remove empty nodes created by stripping the marker.
     */
    if (firstChild.value === '') {
      paragraphChildren.shift();
    }

    if (paragraphChildren.length === 0) {
      children.shift();
    }

    /**
     * Replace the blockquote with AlertBox JSX.
     */
    parent.children[index] = createJSXElement(JSX_IMPORTS.AlertBox.name, {
      inline: false,
      children,
      level: GITHUB_ALERT_TYPES[match[1]],
      title: toTitle(match[1]),
    });

    /**
     * Skip the detached blockquote.
     *
     * Returning index causes the new AlertBox at this
     * position to be visited again, allowing nested
     * alerts to transform.
     */
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
 * @see https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-syntax#alerts
 */
export default () => transformer;
