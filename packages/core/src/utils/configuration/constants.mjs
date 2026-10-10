'use strict';

import { getHeapStatistics } from 'node:v8';

/**
 * The default `threads` ceiling. Each worker holds a heap of its own, with the
 * libraries and the pages it is working on, so past a few threads memory, not
 * CPU, is what runs out. `--threads` raises it.
 */
export const DEFAULT_MAX_THREADS = 4;

/**
 * The heap size limit V8 gave this process, in MB.
 */
export const HEAP_SIZE_LIMIT = Math.floor(
  getHeapStatistics().heap_size_limit / 1024 ** 2
);

/**
 * The default `workerHeapSize` ceiling, in MB. V8 lets a heap grow to several
 * times its live data before collecting it, the more the higher its limit (four
 * times from 2GB up, and on a machine with plenty of memory that limit is 4GB),
 * so every worker held several times what it was using. The biggest page of the
 * Node.js docs, `all.html`, takes ~300MB. `--worker-heap-size` raises it.
 */
export const DEFAULT_MAX_WORKER_HEAP_SIZE = 512;

/**
 * The default number of items each worker task processes.
 */
export const DEFAULT_CHUNK_SIZE = 10;
