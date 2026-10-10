'use strict';

/**
 * Infers the "real" function name from a heading node.
 * Useful when auto-generated headings differ from code tokens.
 *
 * @param {import('@doc-kit/core/generators/metadata/types').HeadingData} heading - Metadata with name and text fields.
 * @param {any} fallback - Fallback value if inference fails.
 */
export const getFullName = ({ name, text }, fallback = name) => {
  // If the name and text are identical, just use fallback
  if (name === text) {
    return fallback;
  }

  // Attempt to extract inline code from heading text
  const code = text.trim().match(/`([^`]+)`/)?.[1];

  if (!code?.includes(name)) {
    return fallback;
  }

  // Find the occurrence of `name` that denotes the documented entry: the one
  // immediately followed by its parameter list, a closing quote, or the end
  // of the code. Earlier occurrences are mere substrings of the receiver
  // (e.g. `channel` within `diagnostics_channel.channel`, `read` within
  // `readable.read`), and later ones can be parameters repeating the name.
  let end = -1;
  let index = code.indexOf(name);

  while (index !== -1) {
    const next = code[index + name.length];

    if (next === undefined || next === '(' || next === "'" || next === '"') {
      end = index + name.length;
      break;
    }

    index = code.indexOf(name, index + 1);
  }

  // If inline code includes the name, return a clean version of it
  return end === -1
    ? fallback
    : code
        .slice(0, end) // Truncate everything after the name.
        // Strip a leading quote and/or the "new" keyword. The latter requires
        // following whitespace so names containing "new" (e.g. `newListener`)
        // stay intact.
        .replace(/^["']/, '')
        .replace(/^new\s+/, '');
};
