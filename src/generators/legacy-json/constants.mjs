// Grabs a method's name
export const NAME_EXPRESSION = /^['`"]?([^'`": {]+)['`"]?\s*:?\s*/;

// Denotes a method's type
export const TYPE_EXPRESSION = /^\{([^}]+)\}\s*/;

// Checks if there's a leading hyphen
export const LEADING_HYPHEN = /^-\s*/;

// Grabs the default value if present
export const DEFAULT_EXPRESSION = /\s*\*\*Default:\*\*\s*([^]+)$/i;

// Grabs the parameters from a method's signature
//  ex/ 'new buffer.Blob([sources[, options]])'.match(PARAM_EXPRESSION) === ['([sources[, options]])', '[sources[, options]]']
export const PARAM_EXPRESSION = /\(([^)]+)\);?$/;

// The plurals associated with each section type.
export const SECTION_TYPE_PLURALS = {
  module: 'modules',
  misc: 'miscs',
  class: 'classes',
  method: 'methods',
  property: 'properties',
  global: 'globals',
  example: 'examples',
  ctor: 'signatures',
  classMethod: 'classMethods',
  event: 'events',
  var: 'vars',
};

// The keys to not promote when promoting children.
export const UNPROMOTED_KEYS = ['textRaw', 'name', 'type', 'desc', 'miscs'];
