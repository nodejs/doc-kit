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
export const isPlainObject = value =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

/**
 * Recursively merges multiple objects deeply.
 * @template T
 * @param {...T} objects - Any number of objects to merge
 * @returns {T} A new object containing the deep merge of all provided objects
 */
export const deepMerge = (...objects) => {
  const base = objects.pop();

  return objects.reduce((result, source) => {
    for (const key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        const sourceValue = source[key];
        const isSourcePlainObject = isPlainObject(sourceValue);

        const targetValue = result[key];
        const baseValue = base[key];

        result[key] =
          isSourcePlainObject && isPlainObject(targetValue)
            ? deepMerge(targetValue, sourceValue, baseValue ?? {})
            : isSourcePlainObject && isPlainObject(baseValue)
              ? deepMerge(sourceValue, baseValue)
              : (sourceValue ?? baseValue);
      }
    }

    return result;
  }, base);
};
