'use strict';

import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { findFiles } from '#utils/glob.mjs';

import { KEY_LENGTH } from './constants.mjs';

/**
 * The key each stored result was stored under. That key already covers
 * everything the result was built from, so it is hashed in place of the
 * result's content.
 *
 * @type {WeakMap<object, string>}
 */
const origins = new WeakMap();

/**
 * @param {unknown} value
 * @returns {value is object}
 */
const isObject = value => typeof value === 'object' && value !== null;

/**
 * Registers the key a result was stored under. Array elements are registered
 * too, since generators often flatten their results.
 *
 * @param {unknown} result
 * @param {string} key
 */
export const trace = (result, key) => {
  if (!isObject(result)) {
    return;
  }

  origins.set(result, key);

  if (Array.isArray(result)) {
    for (const [index, item] of result.entries()) {
      if (isObject(item)) {
        origins.set(item, `${key}/${index}`);
      }
    }
  }
};

/**
 * Serializes a value to JSON, replacing each stored result with its key.
 *
 * @param {unknown} value
 * @returns {string}
 */
const stringify = value =>
  JSON.stringify(value, (_, nested) => origins.get(nested) ?? nested) ?? '';

/**
 * Hashes strings and bytes as they are, and other values as JSON.
 *
 * @param {...unknown} parts
 * @returns {string} The hex digest, {@link KEY_LENGTH} characters long
 */
export const hash = (...parts) => {
  const hasher = createHash('sha256');

  for (const part of parts) {
    const data =
      typeof part === 'string' || ArrayBuffer.isView(part)
        ? part
        : stringify(part);

    // Length-prefixed, so ('ab', 'c') and ('a', 'bc') hash differently
    hasher.update(`${data.length}:`);
    hasher.update(data);
  }

  return hasher.digest('hex').slice(0, KEY_LENGTH);
};

/**
 * Hashes every file under a directory, by relative path and content.
 *
 * @param {string} directory
 * @returns {Promise<string>}
 */
export const hashDirectory = async directory => {
  const files = findFiles('**/*', { cwd: directory }).sort();

  const contents = await Promise.all(
    files.map(file => readFile(join(directory, file)))
  );

  return hash(...files.flatMap((file, index) => [file, contents[index]]));
};
