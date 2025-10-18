import globals from 'globals';

// The default type map path
export const DEFAULT_TYPE_MAP = import.meta.resolve('./typeMap.json');

// These are string replacements specific to Node.js API docs for anchor IDs
export const DOC_API_SLUGS_REPLACEMENTS = [
  { from: /node.js/i, to: 'nodejs' }, // Replace Node.js
  { from: /&/, to: '-and-' }, // Replace &
  { from: /[/_,:;\\ ]/g, to: '-' }, // Replace /_,:;\. and whitespace
  { from: /--+/g, to: '-' }, // Replace multiple hyphens with single
  { from: /^-/, to: '' }, // Remove any leading hyphen
  { from: /-$/, to: '' }, // Remove any trailing hyphen
];

// This is the base URL of the MDN Web documentation
export const DOC_MDN_BASE_URL = 'https://developer.mozilla.org/en-US/docs/Web/';

// This is the base URL of the Man7 documentation
export const DOC_MAN_BASE_URL = 'http://man7.org/linux/man-pages/man';

// This is the base URL for the MDN JavaScript documentation
export const DOC_MDN_BASE_URL_JS = `${DOC_MDN_BASE_URL}JavaScript/`;

// This is the base URL for the MDN JavaScript primitives documentation
export const DOC_MDN_BASE_URL_JS_PRIMITIVES = `${DOC_MDN_BASE_URL_JS}Data_structures`;

// This is the base URL for the MDN JavaScript global objects documentation
export const DOC_MDN_BASE_URL_JS_GLOBALS = `${DOC_MDN_BASE_URL_JS}Reference/Global_Objects/`;

// These are regular expressions used to determine if a given Markdown heading
// is a specific type of API Doc entry (e.g., Event, Class, Method, etc)
// and to extract the inner content of said Heading to be used as the API doc entry name
const CAMEL_CASE = '\\w+(?:\\.\\w+)*';
const FUNCTION_CALL = '\\([^)]*\\)';

// Matches "bar":
// Group 1: foo[bar]
// Group 2: foo.bar
const PROPERTY = `${CAMEL_CASE}(?:(\\[${CAMEL_CASE}\\])|\\.(\\w+))`;

export const DOC_API_HEADING_TYPES = [
  {
    type: 'method',
    regex: new RegExp(`^\`${PROPERTY}${FUNCTION_CALL}\`$`, 'i'),
  },
  { type: 'event', regex: /^Event: +`'?([^']+)'`$/i },
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

// This is a mapping for types within the Markdown content and their respective
// JavaScript primitive types within the MDN JavaScript docs
// @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Data_structures#primitive_values
export const DOC_TYPES_MAPPING_PRIMITIVES = {
  ...Object.fromEntries(
    [
      'null',
      'undefined',
      'boolean',
      'number',
      'bigint',
      'string',
      'symbol',
    ].map(e => [e, e])
  ),
  integer: 'number',
};

// This is a mapping for types within the Markdown content and their respective
// JavaScript globals types within the MDN JavaScript docs
// @see DOC_MDN_BASE_URL_JS_GLOBALS
export const DOC_TYPES_MAPPING_GLOBALS = {
  ...Object.fromEntries(
    [
      // This is updated with every ES-spec, so, as long as the
      // `globals` package is up-to-date, so will our globals
      // list.
      ...Object.keys(globals.builtin),
      'AsyncGeneratorFunction',
      'AsyncIterator',
      'AsyncFunction',
      'TypedArray',
      'ErrorEvent',
    ].map(e => [e, e])
  ),
  'WebAssembly.Instance': 'WebAssembly/Instance',
};

// This is a mapping for miscellaneous types within the Markdown content and their respective
// external reference on appropriate 3rd-party vendors/documentation sites.
export const DOC_TYPES_MAPPING_OTHER = {
  any: `${DOC_MDN_BASE_URL_JS_PRIMITIVES}#Data_types`,
  this: `${DOC_MDN_BASE_URL_JS}Reference/Operators/this`,

  ArrayBufferView: `${DOC_MDN_BASE_URL}/API/ArrayBufferView`,

  AsyncIterable: 'https://tc39.github.io/ecma262/#sec-asynciterable-interface',

  'Module Namespace Object':
    'https://tc39.github.io/ecma262/#sec-module-namespace-exotic-objects',

  Iterable: `${DOC_MDN_BASE_URL_JS}Reference/Iteration_protocols#The_iterable_protocol`,

  CloseEvent: `${DOC_MDN_BASE_URL}/API/CloseEvent`,
  EventSource: `${DOC_MDN_BASE_URL}/API/EventSource`,
  MessageEvent: `${DOC_MDN_BASE_URL}/API/MessageEvent`,

  DOMException: `${DOC_MDN_BASE_URL}/API/DOMException`,
  Storage: `${DOC_MDN_BASE_URL}/API/Storage`,
  WebSocket: `${DOC_MDN_BASE_URL}/API/WebSocket`,

  FormData: `${DOC_MDN_BASE_URL}API/FormData`,
  Headers: `${DOC_MDN_BASE_URL}/API/Headers`,
  Response: `${DOC_MDN_BASE_URL}/API/Response`,
  Request: `${DOC_MDN_BASE_URL}/API/Request`,
};
