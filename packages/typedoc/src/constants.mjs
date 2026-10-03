import { OptionDefaults } from 'typedoc';

/** The default file name of the type map */
export const DEFAULT_TYPE_MAP = 'type-map.json';

/** The default file name of the page list */
export const DEFAULT_PAGE_LIST = 'pages.json';

/** Block tags TypeDoc knows of; others are the project's own (`@kind`) */
export const STANDARD_TAGS = new Set(OptionDefaults.blockTags);

/** Return types that get no `Returns:` item */
export const VOID_TYPES = new Set(['void', 'undefined']);

/** Utility types documented as the object type they wrap */
export const WRAPPER_TYPES = new Set(['Partial', 'Readonly', 'Required']);

/** The base class whose type argument maps event names to the arguments of their listeners */
export const EVENT_EMITTER = 'EventEmitter';

/** TypeDoc's marker for a type it stopped converting, past `maxTypeConversionDepth`: `Promise<...>` */
export const TRUNCATION = '...';

/** The truncated parts of a type, and the string literal types around them, which may hold `...` too: `"..."` */
export const TRUNCATED_TYPE = /"(?:[^"\\]|\\.)*"|(?<![\w.])\.\.\.(?![\w.[({])/g;

/** The indentation of nested list items */
export const NESTED_INDENT = '  ';

/** A fenced code block of a single line, capturing the line */
export const SINGLE_LINE_FENCE = /^```\w*\n([^\n]*)\n```$/;

/** A value written without spaces or a code span: `'es'`, `false` */
export const BARE_VALUE = /^[^\s`]+$/;

/** A value in a code span, which doc-kit reads as an optional item's default */
export const CODE_SPAN = /^`[^`]+`$/;

/** The first sentence of a paragraph */
export const FIRST_SENTENCE = /^.+?[.!?](?=\s|$)/;

/** A period ending a sentence */
export const TRAILING_PERIOD = /\.$/;

/** A line break followed by more text */
export const LINE_CONTINUATION = /\n(?=.)/g;

/** Runs of whitespace */
export const WHITESPACE = /\s+/g;

/** Runs of blank lines */
export const BLANK_LINES = /\n{3,}/g;

/** Slashes opening or closing a path */
export const EDGE_SLASHES = /^\/+|\/+$/g;
