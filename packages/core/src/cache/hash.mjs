'use strict';

import { hash } from 'node:crypto';

/**
 * Hashes raw data to the 128-bit hex key format used across the cache.
 * Truncated SHA-256: collision-safe at this scale, half the key size.
 *
 * @param {string | Buffer} data - Data to hash
 * @returns {string} 32-char hex hash
 */
export const hashData = data => hash('sha256', data, 'hex').slice(0, 32);

/**
 * Serializes a value into a canonical JSON string: a `JSON.stringify` pass
 * whose replacer sorts object keys and serializes functions and bigints by
 * source text. `undefined` behaves as JSON does (omitted from objects, `null`
 * in arrays and at the top level). Cyclic values throw — callers treat any
 * hashing failure as "disable caching", never "guess".
 *
 * @param {unknown} value - Value to serialize
 * @returns {string} Canonical JSON
 */
export const canonicalJSON = value =>
  JSON.stringify(value, (_, val) => {
    if (typeof val === 'function' || typeof val === 'bigint') {
      return String(val);
    }

    if (val === null || typeof val !== 'object' || Array.isArray(val)) {
      return val;
    }

    return Object.fromEntries(
      Object.entries(val).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    );
  }) ?? 'null';

/**
 * Hashes any JSON-serializable value canonically.
 *
 * @param {unknown} value - Value to hash
 * @returns {string} 32-char hex hash
 */
export const hashValue = value => hashData(canonicalJSON(value));

/**
 * Combines hash parts into one key. Parts are joined with an unambiguous
 * separator so `('ab', 'c')` and `('a', 'bc')` differ.
 *
 * @param {...string} parts - Hashes or literals to combine
 * @returns {string} 32-char hex hash
 */
export const combine = (...parts) => hashData(parts.join('\x00'));
