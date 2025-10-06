'use strict';

export const SCHEMA_FILENAME = 'node-doc-schema.json';

// Grabs the default value if present
export const DEFAULT_EXPRESSION = /^(?:D|d)efault(?:s|):$/;

// Grabs the type and description of one of the formats for event types
export const EVENT_TYPE_DESCRIPTION_EXTRACTOR = /{(.*)}(.*)/;

// Grabs type and optional description for a method's parameter signature
export const METHOD_TYPE_EXTRACTOR = /^{(.*)}( .*)?$/;

// Grabs return type and optional description for a method signature
// Accepts the following:
// Returns: {string}
// Returns {string}
// Returns: {string} bla bla bla
export const METHOD_RETURN_TYPE_EXTRACTOR = /^(?:R|r)eturns(:?) {(.*)}( .*)?$/;

// Grabs the parameters from a method's signature
// ex/ 'new buffer.Blob([sources[, options]])'.match(PARAM_EXPRESSION) === ['([sources[, options]])', '[sources[, options]]']
export const METHOD_PARAM_EXPRESSION = /\((.+)\);?$/;

/**
 * Mapping of {@link HeadingMetadataEntry['type']} to types defined in the
 * JSON schema.
 */
export const ENTRY_TO_SECTION_TYPE = /** @type {const} */ ({
  var: 'property',
  global: 'property',
  module: 'module',
  class: 'class',
  ctor: 'method',
  method: 'method',
  classMethod: 'method',
  property: 'property',
  event: 'event',
  misc: 'text',
  text: 'text',
  example: 'text',
});

/**
 * Some types in the docs have different capitalization than what exists in JS
 * @type {Record<string, string>}
 */
export const DOC_TYPE_TO_CORRECT_JS_TYPE_MAP = {
  integer: 'number',
  bigint: 'BigInt',
  symbol: 'Symbol',
};
