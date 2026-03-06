import { transformNodesToString } from '../../../utils/unist.mjs';
import {
  DOC_MDN_BASE_URL_JS_GLOBALS,
  DOC_MDN_BASE_URL_JS_PRIMITIVES,
  DOC_TYPES_MAPPING_GLOBALS,
  DOC_TYPES_MAPPING_OTHER,
  DOC_TYPES_MAPPING_PRIMITIVES,
  DOC_MAN_BASE_URL,
  DOC_API_HEADING_TYPES,
} from '../constants.mjs';
import { slug } from './slugger.mjs';

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
  // Removes the wrapping tags that wrap the type references such as `<>` and `{}`
  const typeInput = type.replace(/[{}<>]/g, '');

  /**
   * Handles the mapping (if there's a match) of the input text
   * into the reference type from the API docs
   *
   * @param {string} lookupPiece
   * @returns {string} The reference URL or empty string if no match
   */
  const transformType = lookupPiece => {
    // Transform JS primitive type references into Markdown links (MDN)
    if (lookupPiece.toLowerCase() in DOC_TYPES_MAPPING_PRIMITIVES) {
      const typeValue = DOC_TYPES_MAPPING_PRIMITIVES[lookupPiece.toLowerCase()];

      return `${DOC_MDN_BASE_URL_JS_PRIMITIVES}#${typeValue}_type`;
    }

    // Transforms JS Global type references into Markdown links (MDN)
    if (lookupPiece in DOC_TYPES_MAPPING_GLOBALS) {
      return `${DOC_MDN_BASE_URL_JS_GLOBALS}${lookupPiece}`;
    }

    // Transform other external Web/JavaScript type references into Markdown links
    // to diverse different external websites. These already are formatted as links
    if (lookupPiece in DOC_TYPES_MAPPING_OTHER) {
      return DOC_TYPES_MAPPING_OTHER[lookupPiece];
    }

    // Transform Node.js type/module references into Markdown links
    // that refer to other API docs pages within the Node.js API docs
    if (lookupPiece in record) {
      return record[lookupPiece];
    }

    // Transform Node.js types like 'vm.Something'.
    if (lookupPiece.indexOf('.') >= 0) {
      const [mod, ...pieces] = lookupPiece.split('.');
      const isClass = pieces.at(-1).match(/^[A-Z][a-z]/);

      return `${mod}.html#${isClass ? 'class-' : ''}${slug(lookupPiece)}`;
    }

    return '';
  };

  const typePieces = typeInput.split('|').map(piece => {
    // This is the content to render as the text of the Markdown link
    const trimmedPiece = piece.trim();

    // This is what we will compare against the API types mappings
    // The ReGeX below is used to remove `[]` from the end of the type
    const result = transformType(trimmedPiece.replace('[]', ''));

    // If we have a valid result and the piece is not empty, we return the Markdown link
    if (trimmedPiece.length && result.length) {
      return `[\`<${trimmedPiece}>\`](${result})`;
    }
  });

  // Filter out pieces that we failed to map and then join the valid ones
  // into different links separated by a ` | `
  const markdownLinks = typePieces.filter(Boolean).join(' | ');

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
