'use strict';

// See the `version` in schema.json. These values should be in sync.
export const SCHEMA_VERSION = '1.0.0';

// Where a schema version is published.
export const SCHEMA_URL =
  'https://doc-kit.nodejs.org/schemas/api-doc/{schemaVersion}.json';

// The heading classifications the metadata generator assigns, and the node
// kind each one becomes.
export const KINDS = {
  class: 'class',
  ctor: 'constructor',
  method: 'method',
  classMethod: 'staticMethod',
  property: 'property',
  event: 'event',
};

// The kind of a heading that documents no API entry
export const SECTION_KIND = 'section';

// The kinds whose leading typed list is lifted out of the body as data
export const KINDS_WITH_TYPED_LIST = new Set([
  'class',
  'constructor',
  'method',
  'staticMethod',
  'property',
  'event',
]);

// The kinds whose heading declares the parameters of a signature
export const CALLABLE_KINDS = new Set([
  'constructor',
  'method',
  'staticMethod',
]);

// The document-level `type` classifications
export const DOCUMENT_TYPES = new Set(['module', 'misc', 'global']);

// The `displayName="..."` attribute of a fenced code block's info string
export const DISPLAY_NAME = /displayName="([^"]*)"/;

// A rest parameter's marker
export const REST_MARKER = /^\.\.\./;

// The code span around a default value
export const CODE_SPAN = /^`([^]*)`$/;

// The `=` a default value declared in a heading starts with
export const DECLARED_DEFAULT = /^=\s*/;

// The `extends` clause a class heading may carry: `Class: \`Foo extends Bar\``
export const EXTENDS_CLAUSE = / extends +/;
