// On "About this Documentation", we define the stability indices, and thus
// we don't need to check it for stability references
export const IGNORE_STABILITY_STEMS = ['documentation'];

// These are string replacements specific to Node.js API docs for anchor IDs
export const DOC_API_SLUGS_REPLACEMENTS = [
  { from: /node.js/i, to: 'nodejs' }, // Replace Node.js
  { from: /&/, to: '-and-' }, // Replace &
  { from: /[/,:;\\ ]/g, to: '-' }, // Replace /,:;\. and whitespace
  { from: /^-(?=[^-])/g, to: '' }, // Remove a single leading hyphen (preserves -- prefix for CLI flags)
  { from: /(?<!^-*)-+$/g, to: '' }, // Remove any trailing hyphens
  { from: /^(?!-+$)[^-].*?(--+)/g, to: '-' }, // Replace multiple consecutive hyphens (not at start)
];

// These are regular expressions used to determine if a given Markdown heading
// is a specific type of API Doc entry (e.g., Event, Class, Method, etc)
// and to extract the inner content of said Heading to be used as the API doc entry name
const CAMEL_CASE = '\\w+(?:\\.\\w+)*';
const FUNCTION_CALL = '\\([^)]*\\)';

// Matches "bar":
// Group 1: foo[bar]
// Group 2: foo.bar
const PROPERTY = `${CAMEL_CASE}(?:(\\[[^\\]]+\\])|\\.(\\w+))`;

// An array of objects defining the different types of API doc headings we want to
// capture and their respective regex to match against the heading text.
// The regex are case-insensitive.
export const DOC_API_HEADING_TYPES = [
  {
    type: 'method',
    regex: new RegExp(
      `^\`(?:${PROPERTY}|(${CAMEL_CASE}))${FUNCTION_CALL}\`$`,
      'i'
    ),
  },
  { type: 'event', regex: /^Event: +`'?([^`]*?)'?`$/i },
  {
    type: 'class',
    regex: new RegExp(
      `^Class: +\`(${CAMEL_CASE}(?: extends +${CAMEL_CASE})?)\`$`,
      'i'
    ),
  },
  {
    type: 'ctor',
    regex: new RegExp(`^\`new +(${CAMEL_CASE})${FUNCTION_CALL}\`$`, 'i'),
  },
  {
    type: 'classMethod',
    regex: new RegExp(`^Static method: +\`${PROPERTY}${FUNCTION_CALL}\`$`, 'i'),
  },
  {
    type: 'property',
    regex: new RegExp(`^\`${PROPERTY}\`$`, 'i'),
  },
];

// This regex is used to match basic TypeScript generic types (e.g., Promise<string>)
export const TYPE_GENERIC_REGEX = /^([^<]+)<([^>]+)>$/;

// This is the base URL of the Man7 documentation
export const DOC_MAN_BASE_URL = 'http://man7.org/linux/man-pages/man';
