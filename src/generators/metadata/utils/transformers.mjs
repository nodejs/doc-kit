import { DOC_MAN_BASE_URL, DOC_API_HEADING_TYPES } from '../constants.mjs';
import { slug } from './slugger.mjs';
import { parseType } from './typeParser.mjs';
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
 * This method replaces plain text Types within the Markdown content into Markdown links
 * that link to the actual relevant reference for such type (either internal or external link)
 *
 * @param {string} type The plain type to be transformed into a Markdown link
 * @param {Record<string, string>} record The mapping of types to links
 * @returns {string} The Markdown link as a string (formatted in Markdown)
 */
export const transformTypeToReferenceLink = (type, record) => {
  // Removes the wrapping curly braces that wrap the type references
  // We keep the angle brackets `<>` intact here to parse Generics later
  const typeInput = type.replace(/[{}]/g, '');

  /**
   * Handles the mapping (if there's a match) of the input text
   * into the reference type from the API docs
   *
   * @param {string} lookupPiece
   * @returns {string} The reference URL or empty string if no match
   */
  const transformType = lookupPiece => {
    // Transform Node.js type/module references into Markdown links
    // that refer to other API docs pages within the Node.js API docs
    if (record && lookupPiece in record) {
      return record[lookupPiece];
    }

    const key = lookupPiece.toLowerCase();

    // Check in our built-in map (i.e. TC39 objects)
    if (key in BUILTIN_TYPE_MAP) {
      return BUILTIN_TYPE_MAP[key];
    }

    // Check in MDN
    if (key in MDN_TYPE_MAP) {
      return MDN_TYPE_MAP[key];
    }

    // Transform Node.js types like 'vm.Something'.
    if (lookupPiece.indexOf('.') >= 0) {
      const [mod, ...pieces] = lookupPiece.split('.');
      const isClass = pieces.at(-1).match(/^[A-Z][a-z]/);

      return `${mod}.html#${isClass ? 'class-' : ''}${slug(lookupPiece)}`;
    }

    return '';
  };

  const markdownLinks = parseType(typeInput, transformType);

  // Return the replaced links or the original content if they all failed to be replaced
  // Note that if some failed to get replaced, only the valid ones will be returned
  // If no valid entry exists, we return the original string/type
  return markdownLinks || type;
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
