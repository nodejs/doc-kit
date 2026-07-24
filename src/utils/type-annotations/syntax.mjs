'use strict';

const LEFT_CURLY_BRACE = '{'.charCodeAt(0);
const RIGHT_CURLY_BRACE = '}'.charCodeAt(0);
const DOLLAR_SIGN = '$'.charCodeAt(0);

/**
 * micromark preprocesses `\r`, `\n` and `\r\n` into virtual codes below -2
 * (and represents EOF as `null`).
 *
 * @param {import('micromark-util-types').Code} code
 * @returns {boolean}
 */
const isLineEnding = code => code !== null && code < -2;

/**
 * A `{` immediately following `$` belongs to a template literal (`${...}`),
 * not a type annotation.
 *
 * @param {import('micromark-util-types').Code} code
 * @returns {boolean}
 */
const previousNotDollar = code => code !== DOLLAR_SIGN;

/**
 * Tokenizes a balanced `{...}` span as a `typeAnnotation`.
 *
 * The outer braces become `typeAnnotationMarker` tokens; everything between
 * them becomes one or more `typeAnnotationValue` tokens (split on line
 * endings). Empty (`{}`) and unbalanced spans fail the construct so the `{`
 * falls back to plain text.
 *
 * @type {import('micromark-util-types').Tokenizer}
 */
function tokenizeTypeAnnotation(effects, ok, nok) {
  let depth = 0;
  let hasContent = false;

  /**
   * @type {import('micromark-util-types').State}
   */
  const start = code => {
    effects.enter('typeAnnotation');
    effects.enter('typeAnnotationMarker');
    effects.consume(code);
    effects.exit('typeAnnotationMarker');

    return beforeValue;
  };

  /**
   * @type {import('micromark-util-types').State}
   */
  const beforeValue = code => {
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

      return beforeValue;
    }

    effects.enter('typeAnnotationValue');

    return value(code);
  };

  /**
   * @type {import('micromark-util-types').State}
   */
  const value = code => {
    if (
      code === null ||
      isLineEnding(code) ||
      (code === RIGHT_CURLY_BRACE && depth === 0)
    ) {
      effects.exit('typeAnnotationValue');
      return beforeValue(code);
    }

    switch (code) {
      case LEFT_CURLY_BRACE:
        depth++;
        break;
      case RIGHT_CURLY_BRACE:
        depth--;
        break;
    }

    hasContent = true;
    effects.consume(code);

    return value;
  };

  /**
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
      previous: previousNotDollar,
    },
  },
});
