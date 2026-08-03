'use strict';

const LEFT_CURLY_BRACE = '{'.charCodeAt(0);
const RIGHT_CURLY_BRACE = '}'.charCodeAt(0);
const DOLLAR_SIGN = '$'.charCodeAt(0);
const SPACE = ' '.charCodeAt(0);

// The type starters that are punctuation: `_` and `$` (identifiers), the
// openers of parenthesized, tuple, object, generic and string-literal types,
// the leading `-` of a negative numeric literal, the leading `&`/`|` of an
// intersection or union, and `\` (a legacy escape, decoded further down the
// pipeline). Alphanumeric and non-ASCII starters are handled by `isTypeStart`.
const TYPE_STARTER_PUNCTUATION = new Set(
  [...'_$([{<\'"`-&|\\'].map(character => character.charCodeAt(0))
);

/**
 * micromark preprocesses `\r`, `\n` and `\r\n` into virtual codes below -2
 * (and represents EOF as `null`).
 *
 * @param {import('micromark-util-types').Code} code
 */
const isLineEnding = code => code !== null && code < -2;

/**
 * A tab is preprocessed into -2, followed by -1 for each column it expands to.
 *
 * @param {import('micromark-util-types').Code} code
 */
const isSpace = code => code === SPACE || code === -1 || code === -2;

/**
 * @param {import('micromark-util-types').Code} code
 */
const isAsciiAlphanumeric = code =>
  (code >= 0x30 && code <= 0x39) || // 0-9
  (code >= 0x41 && code <= 0x5a) || // A-Z
  (code >= 0x61 && code <= 0x7a); // a-z

/**
 * Whether a type expression may begin with this character: an identifier or
 * numeric literal (alphanumeric or non-ASCII) or one of the punctuation
 * starters above. Prose that happens to sit between two braces (as in url.md's
 * `U+007B ({), and U+007D (}).`) starts with punctuation that no type can, so
 * this keeps such spans out.
 *
 * @param {import('micromark-util-types').Code} code
 */
const isTypeStart = code =>
  code !== null &&
  (isAsciiAlphanumeric(code) ||
    // Non-ASCII identifier characters
    code >= 0x80 ||
    TYPE_STARTER_PUNCTUATION.has(code));

/**
 * A `{` directly after `$` is prose about template literals, not a type
 * annotation.
 *
 * @param {import('micromark-util-types').Code} code
 */
const previous = code => code !== DOLLAR_SIGN;

/**
 * Tokenizes a balanced `{...}` span as a single `typeAnnotation` token.
 *
 * The outer braces become `typeAnnotationMarker` tokens; everything between
 * them becomes `typeAnnotationValue` chunks (one per line). An unbalanced or
 * empty span, or one whose content cannot start a type, fails the construct,
 * so the `{` falls back to literal text.
 *
 * @type {import('micromark-util-types').Tokenizer}
 */
function tokenizeTypeAnnotation(effects, ok, nok) {
  // Nesting depth of inner `{`/`}` pairs (the wrapping pair is not counted)
  let depth = 0;
  // `{}` (no content at all) must not become an annotation
  let hasContent = false;

  /**
   * At the opening `{`.
   *
   * @type {import('micromark-util-types').State}
   */
  const start = code => {
    effects.enter('typeAnnotation');
    effects.enter('typeAnnotationMarker');
    effects.consume(code);
    effects.exit('typeAnnotationMarker');

    return between;
  };

  /**
   * At a position where a value chunk may start: right after the opening
   * brace or after an interior line ending.
   *
   * @type {import('micromark-util-types').State}
   */
  const between = code => {
    if (code === null) {
      return nok(code);
    }

    if (code === RIGHT_CURLY_BRACE && depth === 0) {
      return hasContent ? finish(code) : nok(code);
    }

    if (isLineEnding(code)) {
      effects.enter('lineEnding');
      effects.consume(code);
      effects.exit('lineEnding');

      return between;
    }

    effects.enter('typeAnnotationValue');

    return value(code);
  };

  /**
   * Inside a value chunk.
   *
   * @type {import('micromark-util-types').State}
   */
  const value = code => {
    if (
      code === null ||
      isLineEnding(code) ||
      (code === RIGHT_CURLY_BRACE && depth === 0)
    ) {
      effects.exit('typeAnnotationValue');

      return between(code);
    }

    if (!hasContent && !isSpace(code)) {
      if (!isTypeStart(code)) {
        return nok(code);
      }

      hasContent = true;
    }

    if (code === LEFT_CURLY_BRACE) {
      depth++;
    } else if (code === RIGHT_CURLY_BRACE) {
      depth--;
    }

    effects.consume(code);

    return value;
  };

  /**
   * At the closing `}`.
   *
   * @type {import('micromark-util-types').State}
   */
  const finish = code => {
    effects.enter('typeAnnotationMarker');
    effects.consume(code);
    effects.exit('typeAnnotationMarker');
    effects.exit('typeAnnotation');

    return ok;
  };

  return start;
}

/**
 * Creates the micromark syntax extension that recognizes `{...}` type
 * annotations in text.
 *
 * @returns {import('micromark-util-types').Extension}
 */
export const typeAnnotationSyntax = () => ({
  text: {
    [LEFT_CURLY_BRACE]: {
      name: 'typeAnnotation',
      tokenize: tokenizeTypeAnnotation,
      previous,
    },
  },
});
