'use strict';

/**
 * The class names of an element. Shiki gives them in `class`, as a string or
 * as a list, and hast in `className`, as a list.
 *
 * @param {import('hast').Element} element
 * @returns {Array<string>}
 */
export const getClassNames = element => {
  const classNames =
    element.properties?.class ?? element.properties?.className ?? [];

  if (Array.isArray(classNames)) {
    return classNames;
  }

  return classNames.split(' ');
};
