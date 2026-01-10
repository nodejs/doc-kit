// @ts-check

import { assertAstType } from './assertAstType.mjs';
import createQueries from './queries/index.mjs';
import { transformNodeToString } from './unist.mjs';

/**
 * @typedef {{
 * type: Array<string>,
 * name?: string,
 * description?: string,
 * isReturnType?: boolean,
 * hasDefaultValue?: boolean,
 * }} Parameter
 */

/**
 * @param {[import('mdast').Text, ...import('mdast').PhrasingContent[]]} children
 * @param {Parameter} parameter
 * @returns {boolean}
 */
function handleStarter(children, parameter) {
  const starterMatch = children[0].value.match(
    createQueries.QUERIES.typedListStarters
  );

  switch (starterMatch?.[1]) {
    case 'Returns': {
      parameter.isReturnType = true;
      break;
    }
    case 'Type': {
      // Do nothing
      break;
    }
    default: {
      // Invalid list item, ignore completely
      return false;
    }
  }

  switch (children[1].type) {
    case 'inlineCode': {
      return extractParameterName(1, children, parameter);
    }
    case 'link': {
      return extractParameterType(1, children, parameter);
    }
    default: {
      // Invalid list item
      return false;
    }
  }
}

/**
 *
 * @param {number} idx
 * @param {Array<import('mdast').PhrasingContent>} children
 * @param {Parameter} parameter
 * @returns {boolean}
 */
function extractParameterName(idx, children, parameter) {
  const nameElement = assertAstType(children[idx], 'inlineCode');
  parameter.name = nameElement.value;

  if (children[idx + 1]?.type !== 'text' || children[idx + 1].value !== ' ') {
    return false;
  }

  return extractParameterType(idx + 2, children, parameter);
}

/**
 *
 * @param {number} idx
 * @param {Array<import('mdast').PhrasingContent>} children
 * @param {Parameter} parameter
 * @returns {boolean}
 */
function extractParameterType(idx, children, parameter) {
  /**
   * @type {Set<string>}
   */
  const types = new Set();

  for (; idx < children.length; idx += 2) {
    const child = children[idx];

    if (child.type !== 'link') {
      // Not a type
      break;
    }

    const typeName = assertAstType(child.children[0], ['text', 'inlineCode']);
    types.add(typeName.value.replaceAll(/(<|>)/g, ''));

    const nextChild = children[idx + 1];
    if (
      !nextChild ||
      nextChild.type !== 'text' ||
      nextChild.value.trim() !== '|'
    ) {
      // No more types to parse
      break;
    }
  }

  if (types.size === 0) {
    return false;
  }

  parameter.type = Array.from(types);
  extractDescription(idx + 1, children, parameter);

  return true;
}

/**
 *
 * @param {number} idx
 * @param {Array<import('mdast').PhrasingContent>} children
 * @param {Parameter} parameter
 */
function extractDescription(idx, children, parameter) {
  if (idx >= children.length) {
    // No description
    return;
  }

  let description = '';

  for (; idx < children.length; idx++) {
    const node = children[idx];

    // Check if this property has a default value
    if (node.type === 'strong') {
      const [child] = node.children;

      // TODO: it'd be great to actually extract the default value here and
      // add it as a property in the section, there isn't really a standard
      // way to specify the default values so that'd be pretty messy right
      // now
      if (
        child?.type === 'text' &&
        createQueries.QUERIES.defaultExpression.test(child?.value)
      ) {
        parameter.hasDefaultValue = true;
      }
    }

    const stringifiedNode = transformNodeToString(node).trim();

    if (stringifiedNode.length > 0) {
      description += `${stringifiedNode} `;
    }
  }

  if (description.length) {
    parameter.description = description.trim();
  }
}

/**
 * TODO docs
 *
 * @param {import('mdast').ListItem} param0
 * @returns {Parameter | undefined}
 */
export function parseParameter({ children: listChildren }) {
  /**
   * @type {Parameter}
   */
  const parameter = {};

  if (listChildren.length === 0) {
    return undefined;
  }

  const { children } = assertAstType(listChildren[0], 'paragraph');

  let isValidItem = false;
  switch (children[0].type) {
    case 'text': {
      isValidItem = handleStarter(children, parameter);
      break;
    }
    case 'inlineCode': {
      isValidItem = extractParameterName(0, children, parameter);
      break;
    }
    case 'link': {
      isValidItem = extractParameterType(0, children, parameter);
      break;
    }
    default: {
      break;
    }
  }

  return isValidItem ? parameter : undefined;
}

/**
 * TODO docs
 * @param {import('mdast').List} list
 * @returns {Array<Parameter>}
 */
export function parseParameterList(list) {
  return list.children
    .map(parseParameter)
    .filter(parameter => parameter !== undefined);
}
