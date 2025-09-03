import { parentPort } from 'node:worker_threads';

import { config } from 'winston';

export default Object.fromEntries(
  Object.keys(config.cli.levels).map(method => [
    method,
    (...args) =>
      parentPort.postMessage({
        type: 'log',
        method,
        args,
      }),
  ])
);
