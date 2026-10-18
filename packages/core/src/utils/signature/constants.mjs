// Grabs a method's name
export const NAME_EXPRESSION = /^['`"]?([^'`": {]+)['`"]?\s*:?\s*/;

// Checks if there's a leading hyphen
export const LEADING_HYPHEN = /^-\s*/;

// The separators between a parameter's type and its description
export const TRIMMABLE_PADDING_REGEX = /^[\s:-]+/;

// Grabs the default value if present
export const DEFAULT_EXPRESSION = /\s*\*\*Default:\*\*\s*([^]+)$/i;

// Grabs the parameters from a method's signature
//  ex/ 'new buffer.Blob([sources[, options]])'.match(PARAM_EXPRESSION) === ['([sources[, options]])', '[sources[, options]]']
export const PARAM_EXPRESSION = /\(([^)]+)\);?$/;
