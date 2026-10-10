'use strict';

/**
 * The heap size limit of each worker thread (V8's old space), in MB. V8 lets a
 * heap grow to several times its live data before collecting it, the more the
 * higher its limit, so every worker held several times what it was using. The
 * biggest page of the Node.js docs, `all.html`, takes ~300MB. Node.js's
 * `--max-old-space-size` replaces it.
 */
export const WORKER_HEAP_SIZE = 512;
