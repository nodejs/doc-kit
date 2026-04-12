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
 * Safely splits a string by a given set of separators at depth 0 (ignoring those inside < > or ( )).
 *
 * @param {string} str The string to split
 * @param {string} separator The separator to split by (e.g., '|', '&', ',', '=>')
 * @returns {string[]} The split pieces
 */

/**
 *
 */
const splitByOuterSeparator = (str, separator) => {
  const pieces = [];
  let current = '';
  let depth = 0;

  for (let i = 0; i < str.length; i++) {
    const char = str[i];

    // Track depth using brackets and parentheses
    if (char === '<' || char === '(') {
      depth++;
    } else if ((char === '>' && str[i - 1] !== '=') || char === ')') {
      depth--;
    }

    // Check for multi-character separators like '=>'
    const isArrow = separator === '=>' && char === '=' && str[i + 1] === '>';
    // Check for single-character separators
    const isCharSeparator = separator === char;

    if (depth === 0 && (isCharSeparator || isArrow)) {
      pieces.push(current.trim());
      current = '';
      if (isArrow) {
        i++;
      } // skip the '>' part of '=>'
      continue;
    }

    current += char;
  }

  pieces.push(current.trim());
  return pieces;
};

/**
 * Recursively parses advanced TypeScript types, including Unions, Intersections, Functions, and Nested Generics.
 * * @param {string} typeString The plain type string to evaluate
 * @param {Function} transformType The function used to resolve individual types into links
 * @returns {string|null} The formatted Markdown link(s), or null if the base type doesn't map
 */
const parseAdvancedType = (typeString, transformType) => {
  const trimmed = typeString.trim();
  if (!trimmed) {
    return null;
  }

  // Handle Unions (|)
  if (trimmed.includes('|')) {
    const parts = splitByOuterSeparator(trimmed, '|');
    if (parts.length > 1) {
      // Re-evaluate each part recursively and join with ' | '
      const resolvedParts = parts.map(
        p => parseAdvancedType(p, transformType) || `\`<${p}>\``
      );
      return resolvedParts.join(' | ');
    }
  }

  // Handle Intersections (&)
  if (trimmed.includes('&')) {
    const parts = splitByOuterSeparator(trimmed, '&');
    if (parts.length > 1) {
      // Re-evaluate each part recursively and join with ' & '
      const resolvedParts = parts.map(
        p => parseAdvancedType(p, transformType) || `\`<${p}>\``
      );
      return resolvedParts.join(' & ');
    }
  }

  // Handle Functions (=>)
  if (trimmed.includes('=>')) {
    const parts = splitByOuterSeparator(trimmed, '=>');
    if (parts.length === 2) {
      const params = parts[0];
      const returnType = parts[1];

      // Preserve the function signature, just link the return type for now
      // (Mapping param types inside the signature string is complex and often unnecessary for simple docs)
      const parsedReturn =
        parseAdvancedType(returnType, transformType) || `\`<${returnType}>\``;
      return `${params} =&gt; ${parsedReturn}`;
    }
  }

  // 3. Handle Generics (Base<Inner, Inner>)
  if (trimmed.includes('<') && trimmed.endsWith('>')) {
    const firstBracketIndex = trimmed.indexOf('<');
    const baseType = trimmed.slice(0, firstBracketIndex).trim();
    const innerType = trimmed.slice(firstBracketIndex + 1, -1).trim();

    const baseResult = transformType(baseType.replace(/\[\]$/, ''));
    const baseFormatted = baseResult
      ? `[\`<${baseType}>\`](${baseResult})`
      : `\`<${baseType}>\``;

    // Split arguments safely by comma
    const innerArgs = splitByOuterSeparator(innerType, ',');
    const innerFormatted = innerArgs
      .map(arg => parseAdvancedType(arg, transformType) || `\`<${arg}>\``)
      .join(', ');

    return `${baseFormatted}&lt;${innerFormatted}&gt;`;
  }

  // Base Case: Plain Type (e.g., string, Buffer, Function)
  const result = transformType(trimmed.replace(/\[\]$/, ''));
  if (trimmed.length && result) {
    return `[\`<${trimmed}>\`](${result})`;
  }

  return null;
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

  // Kick off the recursive parser on the cleaned input
  const markdownLinks = parseAdvancedType(typeInput, transformType);

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
