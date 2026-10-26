'use strict';

/**
 * The default `threads` ceiling. Each worker holds a heap of its own, with the
 * libraries and the pages it is working on, so past a few threads memory, not
 * CPU, is what runs out. `--threads` raises it.
 */
export const DEFAULT_MAX_THREADS = 4;

/**
 * The heap size limit of each worker thread (V8's old space), in MB. V8 lets a
 * heap grow to several times its live data before collecting it, the more the
 * higher its limit, so every worker held several times what it was using. The
 * biggest page of the Node.js docs, `all.html`, takes ~300MB. Node.js's
 * `--max-old-space-size` replaces it.
 */
export const WORKER_HEAP_SIZE = 512;

/**
 * The young generation size limit of each worker thread, in MB. V8 sizes it
 * from the machine's memory, as if each worker were the only one, so it made up
 * over half of a worker's heap. Node.js's `--max-semi-space-size` replaces it.
 */
export const WORKER_YOUNG_GENERATION_SIZE = 96;
