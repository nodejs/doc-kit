'use strict';

/**
 * The default `threads` ceiling. Each worker holds a heap of its own, with the
 * libraries and the pages it is working on, so past a few threads memory, not
 * CPU, is what runs out. `--threads` raises it.
 */
export const DEFAULT_MAX_THREADS = 4;

/**
 * The default number of items each worker task processes.
 */
export const DEFAULT_CHUNK_SIZE = 10;

/**
 * The default directory generators write to when no `output` is configured.
 */
export const DEFAULT_OUTPUT_DIRECTORY = './out';
