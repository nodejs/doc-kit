'use strict';

/**
 * Transforms an object to JSON output consistent with the JSON version.
 * @param {import('../../generators/json/types').Section} section - The source object
 * @param {any[]} args
 * @returns {string} - The JSON output
 */
export const legacyToJSON = (
  {
    api,
    type,
    source,
    introduced_in,
    meta,
    stability,
    stabilityText,
    classes,
    methods,
    properties,
    miscs,
    modules,
    globals,
  },
  ...args
) =>
  JSON.stringify(
    api == null
      ? {
          // all.json special order
          miscs,
          modules,
          classes,
          globals,
          methods,
        }
      : {
          type,
          source,
          introduced_in,
          meta,
          stability,
          stabilityText,
          classes,
          methods,
          properties,
          miscs,
          // index.json shouldn't have a `modules` key:
          ...(api === 'index' ? undefined : { modules }),
          globals,
        },
    ...args
  );
