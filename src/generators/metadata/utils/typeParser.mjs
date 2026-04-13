/**
 * Safely splits a string by a given set of separators at depth 0 (ignoring those inside < > or ( )).
 *
 * @param {string} str The string to split
 * @param {string} separator The separator to split by (e.g., '|', '&', ',', '=>')
 * @returns {string[]} The split pieces
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
 * Safely removes outer parentheses from a type string if they wrap the entire string.
 * This prevents "depth blindness" in the parser by unwrapping types like `(string | number)`
 * into `string | number`, while safely ignoring disconnected groups like `(A) | (B)`.
 *
 * @param {string} typeString The type string to evaluate and potentially unwrap.
 * @returns {string} The unwrapped type string, or the original string if not fully wrapped.
 */
export const stripOuterParentheses = typeString => {
  let trimmed = typeString.trim();

  if (trimmed.startsWith('(') && trimmed.endsWith(')')) {
    let depth = 0;
    let isValidWrapper = true;

    // Iterate through the string, ignoring the last closing parenthesis
    for (let i = 0; i < trimmed.length - 1; i++) {
      if (trimmed[i] === '(') {
        depth++;
      } else if (trimmed[i] === ')') {
        depth--;
      }

      // If depth hits 0 before the end, it means the parentheses don't wrap the whole string
      if (depth === 0) {
        isValidWrapper = false;
        break;
      }
    }

    if (isValidWrapper) {
      return trimmed.slice(1, -1).trim();
    }
  }

  return trimmed;
};
/**
 * Recursively parses advanced TypeScript types, including Unions, Intersections, Functions, and Nested Generics.
 * * @param {string} typeString The plain type string to evaluate
 * @param {Function} transformType The function used to resolve individual types into links
 * @returns {string|null} The formatted Markdown link(s), or null if the base type doesn't map
 */
export const parseType = (typeString, transformType) => {
  // Clean the string and strip unnecessary outer parentheses to prevent depth blindness (e.g., "(string | number)" -> "string | number")
  const trimmed = stripOuterParentheses(typeString);
  if (!trimmed) {
    return null;
  }

  // Handle Functions (=>)
  if (trimmed.includes('=>')) {
    const parts = splitByOuterSeparator(trimmed, '=>');
    if (parts.length > 1) {
      const params = parts[0];

      // Join the rest back together to handle higher-order functions
      const returnType = parts.slice(1).join(' => ');

      // Preserve the function signature, just link the return type for now
      // (Mapping param types inside the signature string is complex and often unnecessary for simple docs)
      const parsedReturn =
        parseType(returnType, transformType) || `\`<${returnType}>\``;
      return `${params} =&gt; ${parsedReturn}`;
    }
  }

  // Handle Unions (|)
  if (trimmed.includes('|')) {
    const parts = splitByOuterSeparator(trimmed, '|');
    if (parts.length > 1) {
      // Re-evaluate each part recursively and join with ' | '
      const resolvedParts = parts.map(
        p => parseType(p, transformType) || `\`<${p}>\``
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
        p => parseType(p, transformType) || `\`<${p}>\``
      );
      return resolvedParts.join(' & ');
    }
  }

  // Handle Generics (Base<Inner, Inner>)
  // Check if it's a generic wrapped in an array (e.g., Promise<string>[])
  const isGenericArray = trimmed.endsWith('[]');
  const genericTarget = isGenericArray ? trimmed.slice(0, -2).trim() : trimmed;

  if (genericTarget.includes('<') && genericTarget.endsWith('>')) {
    const firstBracketIndex = genericTarget.indexOf('<');
    const baseType = genericTarget.slice(0, firstBracketIndex).trim();
    const innerType = genericTarget.slice(firstBracketIndex + 1, -1).trim();

    const cleanBaseType = baseType.replace(/\[\]$/, ''); // Just in case of Base[]<Inner>
    const baseResult = transformType(cleanBaseType);

    const baseFormatted = baseResult
      ? `[\`<${cleanBaseType}>\`](${baseResult})`
      : `\`<${cleanBaseType}>\``;

    const innerArgs = splitByOuterSeparator(innerType, ',');
    const innerFormatted = innerArgs
      .map(arg => parseType(arg, transformType) || `\`<${arg}>\``)
      .join(', ');

    return `${baseFormatted}&lt;${innerFormatted}&gt;${isGenericArray ? '[]' : ''}`;
  }

  // Base Case: Plain Type (e.g., string, Buffer, Function)
  // Preserve array notation for base types
  const isArray = trimmed.endsWith('[]');
  const cleanType = trimmed.replace(/\[\]$/, '');

  const result = transformType(cleanType);
  if (cleanType.length && result) {
    return `[\`<${cleanType}>\`](${result})${isArray ? '[]' : ''}`;
  }

  return null;
};
