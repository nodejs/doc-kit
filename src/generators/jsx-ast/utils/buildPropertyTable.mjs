import { h as createElement } from 'hastscript';

import createQueries from '../../../utils/queries/index.mjs';
import { TRIMMABLE_PADDING_REGEX } from '../constants.mjs';

/**
 * Determines if a node looks like part of a type annotation.
 *
 * Returns:
 * - 2 if the node is a union separator (e.g. `' | '`)
 * - 1 if the node is a type reference (e.g. `<MyType>`)
 * - 0 if it's not type-related
 *
 * @param {import('mdast').Node} node - The MDAST node to analyze
 */
export const classifyTypeNode = node => {
  // Union separator is plain text with exact value `' | '`
  if (node.type === 'text' && node.value === ' | ') {
    return 2;
  }

  // Type references like `<Type>` are links wrapping inlineCode
  if (
    node.type === 'link' &&
    node.children?.[0]?.type === 'inlineCode' &&
    node.children[0].value?.startsWith('<')
  ) {
    return 1;
  }

  return 0; // Not a type node
};

/**
 * Attempts to extract the property name from the start of a paragraph.
 *
 * @param {Array<import('mdast').PhrasingContent>} children - Paragraph content nodes
 */
export const extractPropertyName = children => {
  if (!children.length) {
    return;
  }

  const first = children[0];

  // Inline code (`foo`) becomes <code>foo</code>
  if (first.type === 'inlineCode') {
    // Remove the node from the children, as we processed it.
    children.shift();
    return createElement('code', first.value.trimEnd());
  }

  // Text with a prefix like "Type:", "Param:", etc.
  if (first.type === 'text') {
    const starterMatch = first.value.match(
      createQueries.QUERIES.typedListStarters
    );
    if (starterMatch) {
      // If the starter is 'Type', we don't have a property.
      const label = starterMatch[1] !== 'Type' && starterMatch[1];

      // Trim off the matched prefix
      first.value = first.value.slice(starterMatch[0].length);

      // Remove node entirely if no value remains
      if (!first.value.trim()) {
        children.shift();
      }

      return label;
    }
  }

  return undefined;
};

/**
 * Scans through the paragraph content and pulls out any type annotations.
 *
 * @param {Array<import('mdast').PhrasingContent>} children
 */
export const extractTypeAnnotations = children => {
  const types = [];

  while (children.length > 0) {
    const typeKind = classifyTypeNode(children[0]);

    if (typeKind === 0) {
      // Stop when the next node is not type-related
      break;
    }

    types.push(children.shift()); // Add type or union separator

    // If union separator, include next type too
    if (typeKind === 2 && children.length) {
      types.push(children.shift());
    }
  }

  return types;
};

/**
 * Converts an MDAST list of typed properties into structured property data.
 *
 * @param {import('mdast').List} node - The input list node
 */
export const parseListIntoProperties = node => {
  const properties = [];

  for (const item of node.children) {
    // The children of the first element (the paragraph) is the list.
    const [{ children }, ...sublists] = item.children;

    const name = extractPropertyName(children);

    // After all of that shifting, remove the (possible) blank
    // space.
    if (children[0]?.type === 'text' && !children[0].value.trim()) {
      children.shift();
    }

    const types = extractTypeAnnotations(children);

    // Clean up leading whitespace in remaining description
    if (children[0]?.type === 'text') {
      children[0].value = children[0].value.replace(
        TRIMMABLE_PADDING_REGEX,
        ''
      );
    }

    properties.push({
      name,
      types,
      // The remaining children are the description
      desc: children,
      // Is there a list within this list?
      sublist: sublists.find(createQueries.UNIST.isLooselyTypedList),
    });
  }

  return properties;
};

/**
 * Renders a table of properties based on parsed metadata from a Markdown list.
 *
 * @param {import('mdast').List} node - Source list node from MDAST
 * @param {boolean} [withHeading=true] - Whether to include table headings
 */
const createPropertyTable = (node, withHeading = true) => {
  const properties = parseListIntoProperties(node);

  // Generate table rows for each property
  const rows = properties.flatMap(prop => {
    const cells = [
      createElement('td', prop.name || '-'),
      createElement('td', prop.types.length > 0 ? prop.types : '-'),
      createElement('td', prop.desc.length > 0 ? prop.desc : '-'),
    ];

    const mainRow = createElement('tr', cells);

    // If the property has a nested sublist, add a second row for the subtable
    if (prop.sublist) {
      const nestedRow = createElement(
        'tr',
        createElement(
          'td',
          { colspan: cells.length },
          createPropertyTable(prop.sublist, false)
        )
      );
      return [mainRow, nestedRow];
    }

    return mainRow;
  });

  // Render the full table
  return withHeading
    ? createElement('table', [
        createElement('thead', [
          createElement('tr', [
            createElement('th', 'Property'),
            createElement('th', 'Type'),
            createElement('th', 'Description'),
          ]),
        ]),
        createElement('tbody', rows),
      ])
    : createElement('table', rows);
};

export default createPropertyTable;
