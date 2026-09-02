'use strict';

// Heading types that document a callable and therefore may appear several times
// in a row as overloaded signatures of the same function.
const OVERLOADABLE_TYPES = new Set(['method', 'ctor', 'classMethod']);

/**
 * Two headings document the same function (i.e. are overloads of one another)
 * when they sit at the same depth and share the same resolved name and type.
 *
 * @param {import('../generators/metadata/types').HeadingNode} a
 * @param {import('../generators/metadata/types').HeadingNode} b
 */
const isSameFunction = (a, b) =>
  a.depth === b.depth &&
  a.data.type === b.data.type &&
  a.data.name === b.data.name;

/**
 * Flags overloaded function headings so consumers can present a single entry
 * per function.
 *
 * Node.js documents each overload of a function as its own heading (e.g. the
 * five `new Buffer(...)` signatures). This marks the 2nd..nth heading of each
 * such run with `isOverload`, and with `overloadOf` pointing at the slug of
 * the run's first heading. The first (most stable) heading is left as-is.
 *
 * @param {Array<import('../generators/metadata/types').MetadataEntry>} entries - Entries, in document order.
 * @returns {Array<import('../generators/metadata/types').MetadataEntry>} The same entries (mutated).
 */
export const annotateOverloads = entries => {
  for (let i = 0; i < entries.length; i++) {
    const { heading } = entries[i];

    if (!OVERLOADABLE_TYPES.has(heading.data.type)) {
      continue;
    }

    // Flag each following heading that overloads the same function.
    let end = i + 1;
    while (
      end < entries.length &&
      isSameFunction(entries[end].heading, heading)
    ) {
      entries[end].heading.data.isOverload = true;
      entries[end].heading.data.overloadOf = heading.data.slug;
      end++;
    }

    i = end - 1;
  }

  return entries;
};
