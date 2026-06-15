import { TYPE_OPENERS, TYPE_CLOSERS } from '../constants.mjs';

/** True when the `>` at `i` is the tail of `=>` and shouldn't pop depth. */
const isArrowTail = (str, i) => str[i] === '>' && str[i - 1] === '=';

/**
 * Walks `str` once, invoking `onToken(i, char)` for each character that
 * sits at depth 0. `onToken` may return:
 * - a number: advance the cursor by that many extra positions
 * - `true`: stop iteration altogether
 */
const walkAtDepthZero = (str, onToken) => {
  let depth = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    if (TYPE_OPENERS.has(char)) {
      depth++;
    } else if (TYPE_CLOSERS.has(char) && !isArrowTail(str, i)) {
      depth--;
    }

    if (depth === 0) {
      const skip = onToken(i, char);
      if (skip === true) {
        return;
      }
      if (typeof skip === 'number') {
        i += skip;
      }
    }
  }
};

/** Resolve a bare type name to its inner rendering with URL */
const formatType = (name, transformType) => {
  const url = transformType(name);
  return url ? `[${name}](${url})` : name;
};

/** Resolve a sub-expression recursively, falling back to the bare text. */
const resolveOr = (part, transformType) =>
  parseInner(part, transformType) ?? part.trim();

/**
 * Splits `str` by `separator` at depth 0. `separator` is a single
 * character or the two-char string '=>'.
 */
const splitByOuterSeparator = (str, separator) => {
  const isArrow = separator === '=>';
  const pieces = [];
  let start = 0;

  walkAtDepthZero(str, (i, char) => {
    const matches = isArrow
      ? char === '=' && str[i + 1] === '>'
      : char === separator;
    if (!matches) {
      return;
    }
    pieces.push(str.slice(start, i).trim());
    start = i + (isArrow ? 2 : 1);
    if (isArrow) {
      return 1;
    } // skip the '>'
  });

  pieces.push(str.slice(start).trim());
  return pieces;
};

/**
 * Strips redundant outer parens like `((A | B))` → `A | B`, while
 * leaving `(A) | (B)` alone.
 */
const stripOuterParentheses = typeString => {
  let s = typeString.trim();
  while (s.length >= 2 && s.startsWith('(') && s.endsWith(')')) {
    let wrapsWhole = true;
    walkAtDepthZero(s.slice(0, -1), i => {
      if (i > 0) {
        wrapsWhole = false;
        return true; // stop early
      }
    });
    if (!wrapsWhole) {
      break;
    }
    s = s.slice(1, -1).trim();
  }
  return s;
};

/**
 * Finds the lowest-precedence top-level operator: `=>` beats `|` beats
 * `&`.
 */
const findTopLevelOperator = str => {
  let arrowIdx = -1;
  let unionIdx = -1;
  let intersectIdx = -1;

  walkAtDepthZero(str, (i, char) => {
    if (char === '=' && str[i + 1] === '>') {
      if (arrowIdx === -1) {
        arrowIdx = i;
      }
      return 1; // skip '>'
    }
    if (char === '|' && unionIdx === -1) {
      unionIdx = i;
    } else if (char === '&' && intersectIdx === -1) {
      intersectIdx = i;
    }
  });

  if (arrowIdx !== -1) {
    return { op: '=>', index: arrowIdx, width: 2 };
  }

  if (unionIdx !== -1) {
    return { op: '|', index: unionIdx, width: 1 };
  }

  if (intersectIdx !== -1) {
    return { op: '&', index: intersectIdx, width: 1 };
  }

  return null;
};

/**
 * Parses the left side of an arrow function (e.g. `(a: string, b: number)`
 * or `<T>(x: T)`). Locates the parameter list as the last `(` that opens
 * at depth 0.
 */
const parseFunctionSignature = (signature, transformType) => {
  const trimmed = signature.trim();
  if (!trimmed.endsWith(')')) {
    return signature;
  }

  // Find the `(` that opens the outermost group ending at the final `)`.
  let depth = 0;
  let openIdx = -1;
  for (let i = 0; i < trimmed.length; i++) {
    const char = trimmed[i];
    if (depth === 0 && char === '(') {
      openIdx = i;
    }
    if (TYPE_OPENERS.has(char)) {
      depth++;
    } else if (TYPE_CLOSERS.has(char) && !isArrowTail(trimmed, i)) {
      depth--;
    }
  }
  if (openIdx === -1) {
    return signature;
  }

  const prefix = trimmed.slice(0, openIdx);
  const paramsString = trimmed.slice(openIdx + 1, -1);
  if (!paramsString.trim()) {
    return `${prefix}()`;
  }

  const parsedArgs = splitByOuterSeparator(paramsString, ',').map(arg => {
    const colonParts = splitByOuterSeparator(arg, ':');
    if (colonParts.length > 1) {
      const paramName = colonParts[0];
      const paramType = colonParts.slice(1).join(':');
      return `${paramName}: ${resolveOr(paramType, transformType)}`;
    }
    return parseInner(arg, transformType) ?? arg;
  });

  return `${prefix}(${parsedArgs.join(', ')})`;
};

/**
 * Recursively parses a type into its inner rendering.
 *
 * @returns {string | null} Inner markup
 */
const parseInner = (typeString, transformType) => {
  const trimmed = stripOuterParentheses(typeString);
  if (!trimmed) {
    return null;
  }

  const op = findTopLevelOperator(trimmed);
  if (op) {
    if (op.op === '=>') {
      const left = trimmed.slice(0, op.index).trim();
      const right = trimmed.slice(op.index + op.width).trim();
      const sig = parseFunctionSignature(left, transformType);
      return `${sig} => ${resolveOr(right, transformType)}`;
    }

    // Union / intersection
    const parts = splitByOuterSeparator(trimmed, op.op);
    const joiner = op.op === '|' ? ' | ' : ' & ';
    return parts.map(p => resolveOr(p, transformType)).join(joiner);
  }

  // Strip a trailing `[]` for now; reapply on the way out.
  const isArray = trimmed.endsWith('[]');
  const core = isArray ? trimmed.slice(0, -2).trim() : trimmed;
  const arrayTail = isArray ? '[]' : '';

  // Generic: `Base<...>`.
  const ltIdx = core.indexOf('<');
  if (ltIdx !== -1 && core.endsWith('>')) {
    const baseType = core.slice(0, ltIdx).trim();
    const innerType = core.slice(ltIdx + 1, -1).trim();
    const inner = splitByOuterSeparator(innerType, ',')
      .map(arg => resolveOr(arg, transformType))
      .join(', ');
    return `${formatType(baseType, transformType)}<${inner}>${arrayTail}`;
  }

  // Plain base type.
  if (!core.length) {
    return null;
  }

  const url = transformType(core);
  if (!url) {
    return null;
  }

  return `${formatType(core, transformType)}${arrayTail}`;
};

/**
 * Recursively parses TypeScript types into Markdown, wrapped in a code span.
 *
 * @param {string} typeString The type string to evaluate.
 * @param {(name: string) => string | null | undefined} transformType Resolves a bare type name to a URL, or returns falsy.
 * @returns {string | null} Markdown for the type, or null when the base type doesn't resolve.
 */
export const parseType = (typeString, transformType) => {
  const inner = parseInner(typeString, transformType);
  if (inner === null) {
    return null;
  }
  return `<code><${inner}></code>`;
};
