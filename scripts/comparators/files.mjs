import { createHash } from 'node:crypto';
import { glob, readFile } from 'node:fs/promises';
import path from 'node:path';

import { BENCHMARK_FILE, COMPARISON_FILE } from '../constants.mjs';

const METADATA_FILES = new Set([BENCHMARK_FILE, COMPARISON_FILE]);
const HASH_STAMP = /-([A-Za-z0-9_-]{8})(?=\.[^./]+$)/;

const isStamp = value => /\d/.test(value) && /[A-Z]/.test(value);

const withoutStamp = file =>
  file.replace(HASH_STAMP, (stamp, hash) =>
    isStamp(hash) ? '-[hash]' : stamp
  );

export const listOutputFiles = async directory => {
  const entries = glob('**/*', {
    cwd: directory,
    withFileTypes: true,
    exclude: entry => METADATA_FILES.has(entry.name),
  });

  return (await Array.fromAsync(entries))
    .filter(entry => entry.isFile())
    .map(entry =>
      path.relative(directory, path.join(entry.parentPath, entry.name))
    )
    .sort();
};

const hashFiles = async (directory, files) =>
  new Map(
    await Promise.all(
      files.map(async file => [
        file,
        createHash('sha256')
          .update(await readFile(path.join(directory, file)))
          .digest('hex'),
      ])
    )
  );

const groupBy = (files, key) =>
  files.reduce((groups, file) => {
    const group = key(file);
    return groups.set(group, [...(groups.get(group) ?? []), file]);
  }, new Map());

/**
 * Takes the first candidate under `key` that nothing else has claimed yet
 */
const claim = (groups, key, unclaimed) => {
  const match = (groups.get(key) ?? []).find(file => unclaimed.has(file));
  unclaimed.delete(match);
  return match;
};

/**
 * Pairs base and head outputs into one entry per file
 */
export const pairOutputFiles = async (baseDirectory, headDirectory) => {
  const [baseFiles, headFiles] = await Promise.all(
    [baseDirectory, headDirectory].map(listOutputFiles)
  );

  const headNames = new Set(headFiles);
  const kept = baseFiles.filter(file => headNames.has(file));
  const keptNames = new Set(kept);

  const baseOnly = baseFiles.filter(file => !keptNames.has(file));
  const headOnly = headFiles.filter(file => !keptNames.has(file));

  // Only the leftovers are read; equal names already agree on identity.
  const [baseHashes, headHashes] = await Promise.all([
    hashFiles(baseDirectory, baseOnly),
    hashFiles(headDirectory, headOnly),
  ]);

  const unclaimed = new Set(headOnly);
  const byContent = groupBy(headOnly, file => headHashes.get(file));
  const bySlot = groupBy(headOnly, withoutStamp);

  const matched = baseOnly
    // Equal bytes are proof of a match, so every one of them is settled before
    // a slot is handed out on the weaker evidence of a name.
    .map(base => ({
      base,
      head: claim(byContent, baseHashes.get(base), unclaimed),
    }))
    .map(({ base, head }) =>
      head
        ? { base, head, identical: true }
        : {
            base,
            head: claim(bySlot, withoutStamp(base), unclaimed),
            identical: false,
          }
    );

  const sortKey = ({ base, head }) => head ?? base;

  return [
    ...kept.map(file => ({ base: file, head: file, identical: false })),
    ...matched,
    ...[...unclaimed].map(head => ({ head, identical: false })),
  ].sort((a, b) => (sortKey(a) < sortKey(b) ? -1 : 1));
};
