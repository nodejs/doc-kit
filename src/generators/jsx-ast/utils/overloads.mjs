'use strict';

// Heading types that document a callable and therefore may appear several times
// in a row as overloaded signatures of the same function.
const OVERLOADABLE_TYPES = new Set(['method', 'ctor', 'classMethod']);

/**
 * Two headings document the same function (i.e. are overloads of one another)
 * when they sit at the same depth and share the same resolved name and type.
 *
 * @param {import('../../metadata/types').HeadingNode} a
 * @param {import('../../metadata/types').HeadingNode} b
 */
const isSameFunction = (a, b) =>
  a.depth === b.depth &&
  a.data.type === b.data.type &&
  a.data.name === b.data.name;

/**
 * Flags overloaded function headings so the Table of Contents shows a single
 * entry per function.
 *
 * Node.js documents each overload of a function as its own heading (e.g. the
 * five `new Buffer(...)` signatures). This marks the 2nd..nth heading of each
 * such run with `isOverload` so they can be dropped from the ToC while still
 * rendering in full on the page. The first (most stable) heading is left as-is,
 * and the ToC links to its existing anchor.
 *
 * @param {Array<import('../../metadata/types').MetadataEntry>} entries - Page entries, in render order.
 * @returns {Array<import('../../metadata/types').MetadataEntry>} The same entries (mutated).
 */
export const annotateOverloads = entries => {
  for (let i = 0; i < entries.length; i++) {
    if (!OVERLOADABLE_TYPES.has(entries[i].heading.data.type)) {
      continue;
    }

    // Flag each following heading that overloads the same function.
    let end = i + 1;
    while (
      end < entries.length &&
      isSameFunction(entries[end].heading, entries[i].heading)
    ) {
      entries[end].heading.data.isOverload = true;
      end++;
    }

    i = end - 1;
  }

  return entries;
};
