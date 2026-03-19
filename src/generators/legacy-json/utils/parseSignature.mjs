'use strict';

import { PARAM_EXPRESSION } from '../constants.mjs';

const OPTIONAL_LEVEL_CHANGES = { '[': 1, ']': -1 };

/**
 * @param {Number} depth
 * @param {String} char
 * @returns {Number}
 */
const updateDepth = (depth, char) =>
  depth + (OPTIONAL_LEVEL_CHANGES[char] || 0);

/**
 * @param {string} parameterName
 * @param {number} optionalDepth
 * @returns {[string, number, boolean]}
 */
export function parseNameAndOptionalStatus(parameterName, optionalDepth) {
  // Let's check if the parameter is optional & grab its name at the same time.
  //  We need to see if there's any leading brackets in front of the parameter
  //  name. While we're doing that, we can also get the index where the
  //  parameter's name actually starts at.

  // Find the starting index where the name begins
  const startingIdx = [...parameterName].findIndex(
    char => !OPTIONAL_LEVEL_CHANGES[char]
  );

  // Update optionalDepth based on leading brackets
  optionalDepth = [...parameterName.slice(0, startingIdx)].reduce(
    updateDepth,
    optionalDepth
  );

  // Find the ending index where the name ends
  const endingIdx = [...parameterName].findLastIndex(
    char => !OPTIONAL_LEVEL_CHANGES[char]
  );

  // Extract the actual parameter name
  const actualName = parameterName.slice(startingIdx, endingIdx + 1);
  const isParameterOptional = optionalDepth > 0;

  // Update optionalDepth based on trailing brackets
  // These apply to the NEXT parameter
  optionalDepth = [...parameterName.slice(endingIdx + 1)].reduce(
    updateDepth,
    optionalDepth
  );

  return [actualName, optionalDepth, isParameterOptional];
}

/**
 * @param {string} parameterName
 * @returns {[string, string | undefined]}
 */
export function parseDefaultValue(parameterName) {
  /**
   * @type {string | undefined}
   */
  let defaultValue;
  const equalSignPos = parameterName.indexOf('=');

  if (equalSignPos !== -1) {
    // We do have a default value, let's extract it
    defaultValue = parameterName.substring(equalSignPos).trim();

    // Let's remove the default value from the parameter name
    parameterName = parameterName.substring(0, equalSignPos);
  }

  return [parameterName, defaultValue];
}

/**
 * @param {string} parameterName
 * @param {number} index
 * @param {Array<import('../types.d.ts').ParameterList>} markdownParameters
 * @returns {import('../types.d.ts').Parameter}
 */
export function findParameter(parameterName, index, markdownParameters) {
  const parameter = markdownParameters[index];
  if (parameter?.name === parameterName) {
    return parameter;
  }

  // Method likely has multiple signatures, something like
  //  `new Console(stdout[, stderr][, ignoreErrors])` and `new Console(options)`
  // Try to find the parameter that this is being shared with
  for (const property of markdownParameters) {
    if (property.name === parameterName) {
      return property;
    }

    const matchingOption = property.options?.find(
      option => option.name === parameterName
    );
    if (matchingOption) {
      return { ...matchingOption };
    }
  }

  // Default return if no matches are found
  return { name: parameterName };
}

/**
 * @param {string[]} declaredParameters
 * @param {Array<import('../types.d.ts').ParameterList>} markdownParameters
 */
export function parseParameters(declaredParameters, markdownParameters) {
  /**
   * @type {Array<import('../types.d.ts').Parameter>}
   */
  let parameters = [];

  let optionalDepth = 0;

  declaredParameters.forEach((parameterName, i) => {
    /**
     * @example 'length]]'
     * @example 'arrayBuffer['
     * @example '[sources['
     * @example 'end'
     */
    parameterName = parameterName.trim();

    // We need to do three things here:
    //  1. Determine the declared parameters' name
    //  2. Determine if the parameter is optional
    //  3. Determine if the parameter has a default value

    /**
     * This will handle the first and second thing for us
     * @type {boolean}
     */
    let isParameterOptional;
    [parameterName, optionalDepth, isParameterOptional] =
      parseNameAndOptionalStatus(parameterName, optionalDepth);

    /**
     * Now let's work on the third thing
     * @type {string | undefined}
     */
    let defaultValue;
    [parameterName, defaultValue] = parseDefaultValue(parameterName);

    const parameter = findParameter(parameterName, i, markdownParameters);

    if (isParameterOptional) {
      parameter.optional = true;
    }

    if (defaultValue) {
      parameter.default = defaultValue;
    }

    parameters.push(parameter);
  });

  return parameters;
}

/**
 * @param {string} textRaw Something like `new buffer.Blob([sources[, options]])`
 * @param {Array<import('../types.d.ts').ParameterList} markdownParameters The properties in the AST
 * @returns {import('../types.d.ts').MethodSignature | undefined}
 */
export default (textRaw, markdownParameters) => {
  /**
   * @type {import('../types.d.ts').MethodSignature}
   */
  const signature = { params: [] };

  // Find the return/extends value & filter it out
  markdownParameters = markdownParameters.filter(value => {
    if (value.name === 'return' || value.name === 'extends') {
      signature[value.name] = value;
      return false;
    }

    return true;
  });

  /**
   * Extract the parameters from the method's declaration
   * @example `[sources[, options]]`
   */
  let [, declaredParameters] =
    textRaw.replace(/^`|`$/g, '').match(PARAM_EXPRESSION) || [];

  if (!declaredParameters) {
    return signature;
  }

  /**
   * @type {string[]}
   * @example ['sources[,', 'options]]']
   */
  declaredParameters = declaredParameters.split(',');

  signature.params = parseParameters(declaredParameters, markdownParameters);

  return signature;
};
