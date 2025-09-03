import { parentPort, workerData } from 'node:worker_threads';

import { allGenerators } from '../generators/index.mjs';

const { name, dependencyOutput, extra } = workerData;
const generator = allGenerators[name];

// Execute the generator and send the result or error back to the parent thread
generator
  .generate(dependencyOutput, extra)
  .then(value => parentPort.postMessage({ type: 'response', value }))
  .catch(error => parentPort.postMessage({ type: 'response', error }));
