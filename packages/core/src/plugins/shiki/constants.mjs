'use strict';

// What code in an unknown language is highlighted as
export const FALLBACK_LANGUAGE = 'text';

// What code in these languages is highlighted as, unless configured otherwise.
// Every grammar takes its own memory on each thread, and time to register, and
// TypeScript's highlights JavaScript (types are highlighted as TypeScript
// anyway), as C's does most of C++
export const DEFAULT_ALIASES = new Map([
  ['javascript', 'typescript'],
  ['js', 'typescript'],
  ['mjs', 'typescript'],
  ['cjs', 'typescript'],
  ['cpp', 'c'],
  ['c++', 'c'],
]);
