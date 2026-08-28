'use strict';

// Sections headed by one of these API types are kept together as a single
// chunk, regardless of `maxDepth`: a class page should list its members.
export const SELF_CONTAINED_TYPES = new Set(['class']);

// Headings of one of these API types start a chunk of their own wherever they
// appear (up to `maxDepth`). Untyped headings only do so at depth 2, so prose
// sub-sections stay with the section they belong to.
export const CHUNKABLE_TYPES = new Set(['class', 'event', 'global', 'method']);

// A chunk's file name is derived from its heading. Anything else is slugged.
export const SAFE_FILE_NAME = /^[\w.$-]+$/;

// A URL that is neither absolute, site-absolute, nor a fragment: it was
// authored relative to the module page and must be re-based for a chunk page.
export const RELATIVE_URL = /^(?![a-z][a-z0-9+.-]*:|\/|#|\?)/i;

// Modules that split into fewer chunks than this are left alone: a single
// chunk would just duplicate the full page.
export const MIN_CHUNKS = 2;
