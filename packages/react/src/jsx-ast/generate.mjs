import { combine, hashData, hashValue } from '@nodejs/doc-kit/cache/hash.mjs';
import { getBuildCache } from '@nodejs/doc-kit/cache/index.mjs';
import getConfig from '@nodejs/doc-kit/utils/configuration/index.mjs';
import { groupNodesByModule } from '@nodejs/doc-kit/utils/generators.mjs';
import { jsx, toJs } from 'estree-util-to-js';

import buildContent from './utils/buildContent.mjs';
import { getSortedHeadNodes } from './utils/getSortedHeadNodes.mjs';
import { buildNotFoundPage } from './utils/synthetic/404.mjs';
import { buildAllPage } from './utils/synthetic/all.mjs';
import { buildIndexPage } from './utils/synthetic/index.mjs';

const GENERATOR_SPECIFIER = '@nodejs/doc-kit-generator-react/jsx-ast';

/**
 * Builds the `{ head, entries }` page descriptors for all configured synthetic
 * pages. The descriptors are cheap to build; the expensive `buildContent` step
 * runs later in a worker (via `processChunk`), so the very large synthetic
 * `all` page is never built on the main thread.
 *
 * @param {Array<import('@nodejs/doc-kit/generators/metadata/types').MetadataEntry>} input
 */
const buildSyntheticDescriptors = input => {
  const config = getConfig('jsx-ast');

  return [
    config.generateAllPage && buildAllPage(input),
    config.generateIndexPage && buildIndexPage(input),
    config.generateNotFoundPage && buildNotFoundPage(),
  ].filter(Boolean);
};

/**
 * Derives the cache-key material for one descriptor, or null when the
 * descriptor is uncacheable.
 *
 * Module pages key on their source file's content hash. The synthetic `index`
 * page keys on a projection of exactly what it renders (sorted head names,
 * apis, and stability data), so body-only edits keep it cached. The synthetic
 * `all` page is deliberately uncacheable: it folds every entry, so its key
 * would change on any edit — and when nothing changed at all, the whole run
 * is skipped upstream — leaving no run that could ever hit; storing its huge
 * code string would be pure cache churn.
 *
 * @param {{ head: object, entries?: object[] }} descriptor - Page descriptor
 * @param {import('@nodejs/doc-kit/cache/types').BuildCache} buildCache - Active build cache
 * @param {Array<import('@nodejs/doc-kit/generators/metadata/types').MetadataEntry>} moduleInput - All non-index entries
 * @returns {Promise<string | null>} Key material, or null
 */
const itemKeyBase = async (descriptor, buildCache, moduleInput) => {
  const { head } = descriptor;

  if (!head.synthetic) {
    return (await buildCache.sourceHash(head.path)) ?? null;
  }

  if (head.api === 'index') {
    return hashValue(
      getSortedHeadNodes(moduleInput)
        .filter(entry => entry.stability)
        .map(({ api, heading, stability }) => ({
          api,
          name: heading.data.name,
          stability: {
            index: stability.data.index,
            description: stability.data.description,
          },
        }))
    );
  }

  if (head.api === '404') {
    return 'synthetic:404';
  }

  return null;
};

/**
 * Process a chunk of items in a worker thread.
 *
 * Each item is a `{ head, entries }` descriptor (one module, or a synthetic
 * page). The JSX AST is built AND serialized to a code string here, inside the
 * worker, so the heavy AST — most notably the giant `all` page, which
 * concatenates every module — is dropped in the worker and never crosses back
 * to or accumulates on the main thread. Only the much smaller code string and
 * the page metadata are returned.
 *
 * @type {import('./types').Generator['processChunk']}
 */
export async function processChunk(slicedInput, itemIndices) {
  const results = [];

  for (const idx of itemIndices) {
    const { head, entries } = slicedInput[idx];

    const content = await buildContent(entries, head);

    const { value: code } = toJs(content, { handlers: jsx });

    results.push({ data: content.data, code });
  }

  return results;
}

/**
 * Generates per-page JSX code from API metadata.
 *
 * Cached pages yield `{ data, codeRef }` instead of `{ data, code }`: the
 * code string stays on disk behind a lazy `codeRef.load()`, so downstream
 * consumers that don't need it (a page whose SSR output is also cached)
 * never pay to deserialize it. `codeRef.contentHash` identifies the code by
 * content for downstream keying, identically whether the page was cached or
 * freshly built.
 *
 * @type {import('./types').Generator['generate']}
 */
export async function* generate(input, worker) {
  // The synthetic `index` page replaces the Core `index` document.
  const moduleInput = input.filter(entry => entry.api !== 'index');

  // Create sliced input: each item contains head + its module's entries
  // This avoids sending all 4700+ entries to every worker
  const groupedModules = groupNodesByModule(input);
  const descriptors = getSortedHeadNodes(input).map(head => ({
    head,
    entries: groupedModules.get(head.api),
  }));

  // Process the synthetic pages through the worker pool as well, so their
  // (potentially enormous) content is built and converted off the main thread.
  descriptors.push(...buildSyntheticDescriptors(moduleInput));

  const buildCache = getBuildCache();

  /** @type {Map<number, object>} Cached results by descriptor index */
  const cached = new Map();

  /** @type {Array<{ index: number, dataKey: string | null, codeKey: string | null }>} */
  const misses = [];

  if (buildCache) {
    const salt = buildCache.chainSalt(GENERATOR_SPECIFIER);

    for (const [index, descriptor] of descriptors.entries()) {
      const base = await itemKeyBase(descriptor, buildCache, moduleInput);
      const dataKey = base && combine('jsx-ast:data', salt, base);
      const codeKey = base && combine('jsx-ast:code', salt, base);

      // The code object is only touched (existence + prune protection), not
      // read — that is the whole point of the lazy reference.
      const record = dataKey && (await buildCache.store.get(dataKey));
      const hasCode = codeKey && (await buildCache.store.touch(codeKey));

      if (record && hasCode) {
        const { data, codeHash } = JSON.parse(record);

        cached.set(index, {
          data,
          codeRef: {
            contentHash: codeHash,
            /**
             * Reads the page's code string from the store on demand.
             *
             * @returns {Promise<string | null>}
             */
            load: () => buildCache.store.get(codeKey),
          },
        });
      } else {
        misses.push({ index, dataKey, codeKey });
      }
    }
  } else {
    misses.push(
      ...descriptors.map((_, index) => ({
        index,
        dataKey: null,
        codeKey: null,
      }))
    );
  }

  /** @type {Map<number, object>} Freshly built results by descriptor index */
  const produced = new Map();

  let at = 0;

  // The worker yields chunks in submission order (parallel.mjs), so results
  // pair with misses positionally; results are stored write-behind.
  for await (const chunk of worker.stream(
    misses.map(({ index }) => descriptors[index])
  )) {
    for (const result of chunk) {
      const miss = misses[at++];

      if (miss.dataKey) {
        buildCache.store.put(
          miss.dataKey,
          JSON.stringify({
            data: result.data,
            codeHash: hashData(result.code),
          })
        );
        buildCache.store.put(miss.codeKey, result.code);
      }

      produced.set(miss.index, result);
    }
  }

  // Emit in canonical descriptor order regardless of the hit/miss split, so
  // downstream page ordering is byte-stable.
  for (const [index] of descriptors.entries()) {
    yield [cached.get(index) ?? produced.get(index)];
  }
}
