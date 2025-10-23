'use strict';

// Grabs the default value if present
export const DEFAULT_EXPRESSION = /^(D|d)efault(s|):$/;

// Grabs the type and description of one of the formats for event types
export const EVENT_TYPE_DESCRIPTION_EXTRACTOR = /{(.*)}(.*)/;

// Grabs return type and optional description for a method signature
// Accepts the following:
// Returns: {string}
// Returns {string}
// Returns: {string} bla bla bla
export const METHOD_RETURN_TYPE_EXTRACTOR = /^Returns(:?) {(.*)}( .*)?$/;
