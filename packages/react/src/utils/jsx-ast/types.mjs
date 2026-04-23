import { QUERIES, UNIST } from '#core/utils/queries/index.mjs';
import { transformNodesToString } from '#core/utils/unist.mjs';
import { DEFAULT_EXPRESSION } from '@doc-kittens/legacy/src/utils/json/constants.mjs';
import { u as createTree } from 'unist-builder';

import { TRIMMABLE_PADDING_REGEX } from './constants.mjs';

/**
 * Checks if the node is a union separator (`' | '`) or a type reference
 * (a link wrapping `<Type>` inline code).
 *
 * @param {import('mdast').Node} node
 * @returns {0 | 1 | 2} 0 = not type-related, 1 = type ref, 2 = union separator
 */
export const classifyTypeNode = node => {
  if (node.type === 'text' && node.value === ' | ') {
    return 2;
  }

  const child = node.children?.[0];
  if (
    node.type === 'link' &&
    child?.type === 'inlineCode' &&
    child.value?.startsWith('<')
  ) {
    return 1;
  }

  return 0;
};

/**
 * Removes and returns the leading node if it's blank text.
 *
 * @param {Array<import('mdast').PhrasingContent>} nodes
 */
export const shiftIfBlankText = nodes => {
  if (nodes[0]?.type === 'text' && !nodes[0].value.trim()) {
    nodes.shift();
  }
};

/**
 * Extracts a property name from the front of a paragraph's children.
 * Mutates `nodes` by shifting consumed nodes and updates the current object.
 *
 * @param {Array<import('mdast').PhrasingContent>} nodes
 * @param {Object} current - The current property object being built
 */
export const extractPropertyName = (nodes, current) => {
  const first = nodes[0];
  if (!first) {
    return;
  }

  // `propName` → <code>propName</code>
  if (first.type === 'inlineCode') {
    nodes.shift();
    current.name = first.value.trimEnd();
    return;
  }

  if (first.type !== 'text') {
    return;
  }

  // "Type:" / "Param:" etc.
  const match = first.value.match(QUERIES.typedListStarters);
  if (!match) {
    return;
  }

  // Consume the matched prefix; drop the node entirely if nothing remains
  first.value = first.value.slice(match[0].length);
  shiftIfBlankText(nodes);

  if (match[1]) {
    current.name = match[1];
    // NOTE: We currently only have one "kind". Should others be added for other
    // starters, just replace the `undefined` with the other kinds.
    current.kind = match[1] === 'Returns' ? 'return' : undefined;
  }
};

/**
 * Consumes consecutive type-annotation nodes (type refs and union
 * separators) from the front of `nodes` and updates the current object.
 *
 * @param {Array<import('mdast').PhrasingContent>} nodes
 * @param {import('unified').Processor} remark - The remark processor
 */
export const extractTypeAnnotations = (nodes, remark) => {
  const types = [];

  while (nodes.length) {
    const kind = classifyTypeNode(nodes[0]);
    if (kind === 0) {
      break;
    }

    types.push(nodes.shift());

    // A union separator implies another type follows
    if (kind === 2 && nodes.length) {
      types.push(nodes.shift());
    }
  }

  if (types.length > 0) {
    return remark.runSync(createTree('root', types)).body[0].expression;
  }
};

/**
 * Parses each list item into a structured property descriptor
 *
 * @param {import('mdast').List} node
 * @param {import('unified').Processor} remark - The remark processor
 */
export const parseListIntoProperties = (node, remark) =>
  node?.children.map(item => {
    const [{ children }, ...rest] = item.children;
    const current = {};

    extractPropertyName(children, current);

    // Strip stale whitespace left over after name extraction
    shiftIfBlankText(children);

    current.type = extractTypeAnnotations(children, remark);

    if (children.length > 0) {
      children[0].value &&= children[0].value.replace(
        TRIMMABLE_PADDING_REGEX,
        ''
      );

      current.optional = DEFAULT_EXPRESSION.test(
        transformNodesToString(children)
      );

      current.description = remark.runSync(
        createTree('root', children)
      ).body[0].expression;
    }

    current.children = parseListIntoProperties(
      rest.find(UNIST.isLooselyTypedList),
      remark
    );

    return current;
  });
