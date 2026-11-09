/**
 * Creates a lazy-initialized function that caches the result of the first invocation.
 * @template {(...args: any[]) => any} T
 * @param {T} fn - The function to be lazily executed
 * @returns {T} A wrapper function that lazily executes fn and caches its result
 */
export const lazy = fn =>
  (
    c =>
    (...args) =>
      (c ??= fn(...args))
  )();

/**
 * Checks if a value is a plain JavaScript object.
 * @param {*} value - The value to check
 * @returns {boolean} True if the value is a plain object, false otherwise
 */
export const isPlainObject = value => {
  if (value === null || typeof value !== 'object') {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

/**
 * Checks if a value is an async generator/iterable.
 * @param {unknown} obj - Value to check
 * @returns {obj is AsyncGenerator} True if the value is an async iterable
 */
export const isAsyncIterable = obj =>
  obj !== null &&
  typeof obj === 'object' &&
  typeof obj[Symbol.asyncIterator] === 'function';

/**
 * Returns a shallow copy of `obj` without the specified keys.
 * @param {Record<string, any>} obj
 * @param {string[]} keys - Keys to exclude
 * @returns {Record<string, any>}
 */
export const omitKeys = (obj, keys = []) =>
  Object.fromEntries(
    Object.entries(obj).filter(([key]) => !keys.includes(key))
  );

/**
 * Recursively merges plain objects from left to right.
 * @template T
 * @param {...T} objects - Any number of objects to merge
 * @returns {T} A new object containing the deep merge of all provided objects
 */
export const deepMerge = (...objects) => {
  return objects.reduce((result, source) => {
    for (const [key, sourceValue] of Object.entries(source)) {
      if (sourceValue === undefined) {
        continue;
      }

      const targetValue = result[key];
      result[key] = isPlainObject(sourceValue)
        ? deepMerge(isPlainObject(targetValue) ? targetValue : {}, sourceValue)
        : Array.isArray(sourceValue)
          ? sourceValue.slice()
          : sourceValue;
    }

    return result;
  }, {});
};
