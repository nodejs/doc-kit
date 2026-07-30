/**
 * Converts a value to an array.
 * @template T
 * @param {T | T[]} val - The value to convert.
 * @returns {T[]} The value as an array.
 */
export const enforceArray = val => (Array.isArray(val) ? val : [val]);
