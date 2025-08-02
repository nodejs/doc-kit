'use strict';

import yaml from 'yaml';

import {
  DOC_API_HEADING_TYPES,
  DOC_MDN_BASE_URL_JS_GLOBALS,
  DOC_MDN_BASE_URL_JS_PRIMITIVES,
  DOC_TYPES_MAPPING_GLOBALS,
  DOC_TYPES_MAPPING_NODE_MODULES,
  DOC_TYPES_MAPPING_OTHER,
  DOC_TYPES_MAPPING_PRIMITIVES,
  DOC_MAN_BASE_URL,
} from './constants.mjs';
import createQueries from '../queries/index.mjs';

/**
 * Extracts raw YAML content from a node
 *
 * @param {import('mdast').Node} node A HTML node containing the YAML content
 * @returns {string} The extracted raw YAML content
 */
export const extractYamlContent = node => {
  return node.value.replace(
    createQueries.QUERIES.yamlInnerContent,
    // Either capture a YAML multinline block, or a simple single-line YAML block
    (_, simple, yaml) => simple || yaml
  );
};

/**
 * Normalizes YAML syntax by fixing some non-cool formatted properties of the
 * docs schema
 *
 * @param {string} yamlContent The raw YAML content to normalize
 * @returns {string} The normalized YAML content
 */
export const normalizeYamlSyntax = yamlContent => {
  return yamlContent
    .replace('introduced_in=', 'introduced_in: ')
    .replace('source_link=', 'source_link: ')
    .replace('type=', 'type: ')
    .replace('name=', 'name: ')
    .replace('llm_description=', 'llm_description: ')
    .replace(/^[\r\n]+|[\r\n]+$/g, ''); // Remove initial and final line breaks
};

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
 * @returns {string} The Markdown link as a string (formatted in Markdown)
 */
export const transformTypeToReferenceLink = type => {
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
    if (lookupPiece in DOC_TYPES_MAPPING_NODE_MODULES) {
      return DOC_TYPES_MAPPING_NODE_MODULES[lookupPiece];
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
 * Parses Markdown YAML source into a JavaScript object containing all the metadata
 * (this is forwarded to the parser so it knows what to do with said metadata)
 *
 * @param {string} yamlString The YAML string to be parsed
 * @returns {ApiDocRawMetadataEntry} The parsed YAML metadata
 */
export const parseYAMLIntoMetadata = yamlString => {
  const normalizedYaml = normalizeYamlSyntax(yamlString);

  // Ensures that the parsed YAML is an object, because even if it is not
  // i.e. a plain string or an array, it will simply not result into anything
  /** @type {ApiDocRawMetadataEntry | string} */
  let parsedYaml = yaml.parse(normalizedYaml);

  // Ensure that only Objects get parsed on Object.keys(), since some `<!--`
  // comments, might be just plain strings and not even a valid YAML metadata
  if (typeof parsedYaml === 'string') {
    parsedYaml = { tags: [parsedYaml] };
  }

  return parsedYaml;
};

/**
 * Parses a raw Heading string into Heading metadata
 *
 * @param {string} heading The raw Heading text
 * @param {number} depth The depth of the heading
 * @returns {HeadingMetadataEntry} Parsed Heading entry
 */
export const parseHeadingIntoMetadata = (heading, depth) => {
  for (const { type, regex } of DOC_API_HEADING_TYPES) {
    // Attempts to get a match from one of the heading types, if a match is found
    // we use that type as the heading type, and extract the regex expression match group
    // which should be the inner "plain" heading content (or the title of the heading for navigation)
    const [, ...matches] = heading.match(regex) ?? [];

    if (matches?.length) {
      return {
        text: heading,
        type,
        // The highest match group should be used.
        name: matches.filter(Boolean).at(-1),
        depth,
      };
    }
  }

  return { text: heading, name: heading, depth };
};
