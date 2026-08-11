import { VALID_JAVASCRIPT_PROPERTY } from './constants.mjs';
import { QUERIES } from './index.mjs';

/**
 * Checks whether a single list item looks like a typed parameter — i.e. it
 * starts with a property name (`inlineCode`), a Returns/Extends/Type prefix,
 * or a direct type annotation.
 *
 * @param {import('@types/mdast').ListItem} item
 * @returns {boolean}
 */
export const isTypedListItem = item => {
  const firstNode = item?.children?.[0]?.children?.[0];
  if (!firstNode) {
    return false;
  }

  const value = firstNode?.value?.trimStart();

  // Typed list starters (strong signal)
  if (value && QUERIES.typedListStarters.test(value)) {
    return true;
  }

  // Direct type annotation: {Type}
  if (firstNode.type === 'typeAnnotation') {
    return true;
  }

  // inlineCode + space (weaker signal)
  if (
    firstNode.type === 'inlineCode' &&
    value &&
    VALID_JAVASCRIPT_PROPERTY.test(value)
  ) {
    return true;
  }

  return false;
};

/**
 * @param {import('@types/mdast').List} list
 * @returns {0 | 1 | 2} confidence
 *
 * 0: This is not a typed list
 * 1: This is a loosely typed list
 * 2: This is a strongly typed list
 */
export const isTypedList = list => {
  if (!list || list.type !== 'list') {
    return 0;
  }

  const firstNode = list.children?.[0]?.children?.[0]?.children[0];

  if (!firstNode) {
    return 0;
  }

  const value = firstNode?.value?.trimStart();

  // Typed list starters (strong signal)
  if (value && QUERIES.typedListStarters.test(value)) {
    return 2;
  }

  // Direct type annotation: {Type}
  if (firstNode.type === 'typeAnnotation') {
    return 2;
  }

  // inlineCode + space (weaker signal)
  if (
    firstNode.type === 'inlineCode' &&
    value &&
    VALID_JAVASCRIPT_PROPERTY.test(value)
  ) {
    return 1;
  }

  return 0;
};
