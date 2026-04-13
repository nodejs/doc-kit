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
 * Recursively parses advanced TypeScript types, including Unions, Intersections, Functions, and Nested Generics.
 * * @param {string} typeString The plain type string to evaluate
 * @param {Function} transformType The function used to resolve individual types into links
 * @returns {string|null} The formatted Markdown link(s), or null if the base type doesn't map
 */
export const parseType = (typeString, transformType) => {
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

  // Handle Functions (=>)
  if (trimmed.includes('=>')) {
    const parts = splitByOuterSeparator(trimmed, '=>');
    if (parts.length === 2) {
      const params = parts[0];
      const returnType = parts[1];

      // Preserve the function signature, just link the return type for now
      // (Mapping param types inside the signature string is complex and often unnecessary for simple docs)
      const parsedReturn =
        parseType(returnType, transformType) || `\`<${returnType}>\``;
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
      .map(arg => parseType(arg, transformType) || `\`<${arg}>\``)
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
