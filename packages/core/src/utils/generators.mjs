'use strict';

import { coerce, major } from 'semver';

import { createChannel } from './channel.mjs';
import { isAsyncIterable } from './misc.mjs';
import { transformNodeToString } from './unist.mjs';

/**
 * Retrieves the description of a given API doc entry. It first checks whether
 * the entry has a llm_description property. If not, it extracts the first
 * paragraph from the entry's content.
 *
 * @param {import('../generators/metadata/types').MetadataEntry} entry
 * @returns {string}
 */
export const getEntryDescription = entry => {
  if (entry.llm_description) {
    return entry.llm_description.trim();
  }

  const descriptionNode = entry.content.children.find(
    child => child.type === 'paragraph'
  );

  if (!descriptionNode) {
    return '';
  }

  return (
    transformNodeToString(descriptionNode)
      // Remove newlines and extra spaces
      .replace(/[\r\n]+/g, '')
  );
};

/**
 * Groups all the API metadata nodes by module (`api` property) so that we can process each different file
 * based on the module it belongs to.
 *
 * @param {Array<import('../generators/metadata/types').MetadataEntry>} nodes The API metadata Nodes to be grouped
 */
export const groupNodesByModule = nodes => {
  return Map.groupBy(nodes, node => node.api);
};

/**
 * Gives a generator's input as batches: as they arrive if it streams, or as a
 * single batch if it arrives whole, as it does with one thread.
 *
 * @template T
 * @param {Array<T> | AsyncIterable<Array<T>>} input
 * @returns {Array<Array<T>> | AsyncIterable<Array<T>>}
 */
export const toBatches = input => {
  if (isAsyncIterable(input)) {
    return input;
  }

  return [input];
};

/**
 * Reads several async iterables at once, yielding each item as soon as it
 * arrives, until they have all ended. A failure is thrown once the items that
 * arrived before it are yielded, without waiting for the other iterables.
 *
 * @template T
 * @param {...AsyncIterable<T>} sources
 * @returns {AsyncGenerator<T>}
 */
export async function* merge(...sources) {
  const channel = createChannel();

  let pending = sources.length;
  let failure;

  /**
   * Passes a source's items on as they arrive, and ends the channel once every
   * source has ended, or one fails.
   *
   * @param {AsyncIterable<T>} source
   */
  const pipe = async source => {
    try {
      for await (const item of source) {
        channel.push(item);
      }
    } catch (error) {
      failure ??= { error };
    } finally {
      pending--;

      if (failure || pending === 0) {
        channel.end();
      }
    }
  };

  for (const source of sources) {
    pipe(source);
  }

  yield* channel;

  if (failure) {
    throw failure.error;
  }
}

/**
 * Regroups streamed entries so that each batch holds whole modules: a module
 * whose entries continue in the next batch is held back and passed on with
 * it. A module's entries must arrive together: one that comes back after
 * another module's is an error, wherever the batches end, as its pages would
 * be built without it. Entries given as one array, as a generator that streams
 * its input gets them with one thread, are taken as a single batch.
 *
 * @template {{ api: string }} T
 * @param {Array<T> | AsyncIterable<Array<T>>} batches - The entries, in
 * batches as they are streamed, or in one array
 * @returns {AsyncGenerator<Array<T>>} The same entries, in batches of whole
 * modules
 */
export async function* groupWholeModules(batches) {
  // The modules whose entries have all arrived
  const finished = new Set();

  // The module whose entries are arriving, and those of them held back
  let current;
  let held = [];

  for await (const batch of toBatches(batches)) {
    for (const { api } of batch) {
      if (api !== current) {
        if (finished.has(api)) {
          throw new Error(
            `The entries of "${api}" arrived apart: a module's entries must ` +
              'arrive together, in one chunk or in consecutive ones'
          );
        }

        if (current !== undefined) {
          finished.add(current);
        }

        current = api;
      }
    }

    const entries = held.length > 0 ? [...held, ...batch] : batch;

    // The module the batch ends with may continue in the next one
    let end = entries.length;

    while (end > 0 && entries[end - 1].api === current) {
      end--;
    }

    held = entries.slice(end);

    if (end > 0) {
      yield entries.slice(0, end);
    }
  }

  if (held.length > 0) {
    yield held;
  }
}

/**
 * Parses the SemVer string into a Node.js-alike version
 *
 * @param {import('semver').SemVer} version The version to be parsed
 */
export const getVersionFromSemVer = version =>
  version.minor === 0
    ? `${version.major}.x`
    : `${version.major}.${version.minor}.x`;

/**
 * @TODO: This should not be necessary, and indicates errors within the API docs
 * @TODO: Hookup into a future Validation/Linting API
 *
 * This is a safe fallback to ensure that we always have a SemVer compatible version
 * even if the input is not a valid SemVer string
 *
 * @param {string|import('semver').SemVer} version SemVer compatible version (maybe)
 * @returns {import('semver').SemVer} SemVer compatible version
 */
export const coerceSemVer = version => {
  const coercedVersion = coerce(version);

  if (coercedVersion === null) {
    // @TODO: Linter to complain about invalid SemVer strings
    return coerce('0.0.0-REPLACEME');
  }

  return coercedVersion;
};

/**
 * Gets compatible versions for an entry
 *
 * @param {string | import('semver').SemVer} introduced
 * @param {Array<import('../parsers/types').ReleaseEntry>} releases
 * @returns {Array<import('../parsers/types').ReleaseEntry>}
 */
export const getCompatibleVersions = (introduced, releases) => {
  const coercedMajor = major(coerceSemVer(introduced));
  // All Node.js versions that support the current API; If there's no "introduced_at" field,
  // we simply show all versions, as we cannot pinpoint the exact version
  return releases.filter(release => release.version.major >= coercedMajor);
};

/**
 * Assigns properties from one or more source objects to the target object
 * **without overwriting existing keys** in the target.
 *
 * Similar to `Object.assign`, but preserves the target's existing keys.
 * The target object is mutated in place.
 *
 * @param {Object} target - The object to assign properties to.
 * @param {Object} source - The source object
 */
export const leftHandAssign = (target, source) =>
  Object.keys(source).forEach(k => k in target || (target[k] = source[k]));
