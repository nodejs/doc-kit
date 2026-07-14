import { DOC_MAN_BASE_URL, DOC_API_HEADING_TYPES } from '../constants.mjs';
import { slug } from './slugger.mjs';
import { transformNodesToString } from '../../../utils/unist.mjs';
import BUILTIN_TYPE_MAP from '../maps/builtin.json' with { type: 'json' };
import MDN_TYPE_MAP from '../maps/mdn.json' with { type: 'json' };

/**
 * @param {string} text The inner text
 * @param {string} command The manual page
 * @param {string} sectionNumber The manual section
 * @param {string} sectionLetter The manual section number
 */
export const transformUnixManualToLink = (
  text,
  command,
  sectionNumber,
  sectionLetter = ''
) => {
  return `[\`${text}\`](${DOC_MAN_BASE_URL}${sectionNumber}/${command}.${sectionNumber}${sectionLetter}.html)`;
};

/**
 * Looks a type name up in the type maps: the toolchain-provided map first
 * (Node.js types/modules), then the built-in (TC39) map, then MDN. Map keys
 * may be arbitrary display names (e.g. `zlib options`), not just identifiers.
 *
 * @param {string} name The type name to look up
 * @param {Record<string, string>} typeMap The toolchain mapping of types to links
 * @returns {string} The reference URL or empty string if no match
 */
export const lookupTypeName = (name, typeMap) => {
  if (typeMap && name in typeMap) {
    return typeMap[name];
  }

  const key = name.toLowerCase();

  // Check in our built-in map (i.e. TC39 objects)
  if (key in BUILTIN_TYPE_MAP) {
    return BUILTIN_TYPE_MAP[key];
  }

  // Check in MDN
  if (key in MDN_TYPE_MAP) {
    return MDN_TYPE_MAP[key];
  }

  return '';
};

/**
 * Resolves a type identifier to a documentation URL: map lookups first, then
 * the dotted-name heuristic for Node.js types like `vm.Module` (which links
 * to the module's page).
 *
 * @param {string} name The type identifier to resolve
 * @param {Record<string, string>} typeMap The toolchain mapping of types to links
 * @returns {string} The reference URL or empty string if no match
 */
export const resolveTypeReference = (name, typeMap) => {
  const url = lookupTypeName(name, typeMap);

  if (url) {
    return url;
  }

  // Transform Node.js types like 'vm.Something'.
  if (name.indexOf('.') >= 0) {
    const [mod, ...pieces] = name.split('.');
    const isClass = pieces.at(-1).match(/^[A-Z][a-z]/);

    return `${mod}.html#${isClass ? 'class-' : ''}${slug(name)}`;
  }

  return '';
};

/**
 * Parses a raw Heading string into Heading metadata
 *
 * @param {import('mdast').Heading} heading The raw Heading text
 * @param {number} depth The depth of the heading
 * @returns {HeadingMetadataEntry} Parsed Heading entry
 */
export const transformNodeToHeading = node => {
  const text = transformNodesToString(node.children);

  for (const { type, regex } of DOC_API_HEADING_TYPES) {
    // Attempts to get a match from one of the heading types, if a match is found
    // we use that type as the heading type, and extract the regex expression match group
    // which should be the inner "plain" heading content (or the title of the heading for navigation)
    const [, ...matches] = text.match(regex) ?? [];

    if (matches?.length) {
      return {
        text,
        type,
        // The highest match group should be used.
        name: matches.filter(Boolean).at(-1),
      };
    }
  }

  return { text, name: text, depth: node.depth };
};
