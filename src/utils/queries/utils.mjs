import { VALID_JAVASCRIPT_PROPERTY } from './constants.mjs';
import createQueries from './index.mjs';

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
  if (value && createQueries.QUERIES.typedListStarters.test(value)) {
    return 2;
  }

  // Direct type link: <Type>
  if (
    firstNode.type === 'link' &&
    firstNode.children?.[0]?.value?.startsWith('<')
  ) {
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
