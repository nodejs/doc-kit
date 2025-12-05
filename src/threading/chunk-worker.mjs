import { parentPort, workerData } from 'node:worker_threads';

import { allGenerators } from '../generators/index.mjs';

const { generatorName, fullInput, itemIndices, options } = workerData;

const generator = allGenerators[generatorName];

// Generators must implement processChunk for item-level parallelization
generator
  .processChunk(fullInput, itemIndices, options)
  .then(result => parentPort.postMessage(result))
  .catch(error => parentPort.postMessage({ error: error.message }));
