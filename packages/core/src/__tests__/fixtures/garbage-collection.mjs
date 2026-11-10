import { setFlagsFromString } from 'node:v8';
import { runInNewContext } from 'node:vm';

setFlagsFromString('--expose-gc');

const gc = runInNewContext('gc');

/**
 * Makes chunks of one item each that tell when they are let go.
 *
 * @returns {{ released: Set<number>, chunkOf: (value: number) => Array<{ value: number }> }}
 */
export function trackReleases() {
  const released = new Set();
  const registry = new FinalizationRegistry(value => released.add(value));

  return {
    released,

    /**
     * A chunk holding an item that tells when it is let go.
     *
     * @param {number} value
     * @returns {Array<{ value: number }>}
     */
    chunkOf: value => {
      const item = { value };

      registry.register(item, value);

      return [item];
    },
  };
}

/**
 * Collects garbage until `done` holds, at most ten times.
 *
 * @param {() => boolean} done
 * @returns {Promise<void>}
 */
export async function collectGarbage(done) {
  for (let i = 0; i < 10 && !done(); i++) {
    await new Promise(resolve => setImmediate(resolve));
    gc();
  }
}
