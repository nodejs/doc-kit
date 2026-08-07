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
 * Serializes a value into a canonical JSON string: object keys sorted,
 * `undefined` treated as JSON does (omitted from objects, `null` in arrays),
 * functions by source text, cycles marked. Two structurally equal values
 * always produce the same string.
 *
 * @param {unknown} value - Value to serialize
 * @param {Set<object>} [seen] - Ancestry for cycle detection
 * @returns {string} Canonical JSON
 */
export const canonicalJSON = (value, seen = new Set()) => {
  if (value === undefined) {
    return 'null';
  }

  if (typeof value === 'function') {
    return JSON.stringify(String(value));
  }

  if (typeof value === 'bigint') {
    return JSON.stringify(String(value));
  }

  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (seen.has(value)) {
    return '"[circular]"';
  }

  seen.add(value);

  try {
    if (Array.isArray(value)) {
      return `[${value.map(item => canonicalJSON(item, seen)).join(',')}]`;
    }

    const entries = Object.entries(value)
      .filter(([, val]) => val !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(
        ([key, val]) => `${JSON.stringify(key)}:${canonicalJSON(val, seen)}`
      );

    return `{${entries.join(',')}}`;
  } finally {
    seen.delete(value);
  }
};

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
