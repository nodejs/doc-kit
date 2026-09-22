import { extractListItem } from '@doc-kit/core/utils/signature/extractListItem.mjs';

import { renderAsJSX } from './render.mjs';

/**
 * Parses each list item into a structured property descriptor
 *
 * @param {import('mdast').List} node
 */
export const parseListIntoProperties = node =>
  node?.children.map(item => {
    const {
      name,
      prefix,
      annotation,
      text,
      default: defaultValue,
      items,
    } = extractListItem(item);

    const current = {};

    if (prefix) {
      current.name = prefix;
      // NOTE: We currently only have one "kind". Should others be added for other
      // starters, just replace the `undefined` with the other kinds.
      current.kind = prefix === 'Returns' ? 'return' : undefined;
    } else if (name !== undefined) {
      current.name = name;
    }

    // Unions live inside a single annotation
    current.type = annotation && renderAsJSX([annotation]);

    if (text.length > 0) {
      current.optional = defaultValue !== undefined;
      current.description = renderAsJSX(text);
    }

    current.children =
      items.length > 0
        ? parseListIntoProperties({ children: items })
        : undefined;

    return current;
  });
