import { parentPort, workerData } from 'node:worker_threads';

import WorkerPool from './index.mjs';
import createParallelWorker from './parallel.mjs';
import { allGenerators } from '../generators/index.mjs';

const { generatorName, input, options } = workerData;
const generator = allGenerators[generatorName];

// Create a ParallelWorker for the generator to use for item-level parallelization
const chunkPool = new WorkerPool('./chunk-worker.mjs', options.threads);
const worker = createParallelWorker(generatorName, chunkPool, options);

// Execute the generator and send the result or error back to the parent thread
generator
  .generate(input, { ...options, worker })
  .then(result => parentPort.postMessage(result))
  .catch(error => parentPort.postMessage({ error: error.message }));
