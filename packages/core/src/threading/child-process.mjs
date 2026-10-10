import { fork } from 'node:child_process';
import { once } from 'node:events';

import { createBirpc } from 'birpc';

const hostScript = new URL('./child-process-host.mjs', import.meta.url);

/**
 * Runs a module in a child process of its own, and calls its exports over
 * `birpc`. A process gives all of its memory back when it exits, native
 * memory included, which a worker thread does not.
 *
 * @template T
 * @param {string | URL} moduleURL - The module to run
 * @returns {import('./types').ChildProcess<T>}
 */
export default function createChildProcess(moduleURL) {
  const child = fork(hostScript, [String(moduleURL)], {
    serialization: 'advanced',
  });

  /** @type {import('birpc').BirpcReturn<T>} */
  const rpc = createBirpc(
    {},
    {
      /** @param {unknown} message */
      post: message => child.send(message),
      // Returns nothing: birpc holds its first call until `on`'s result settles
      /** @param {(message: unknown) => void} listener */
      on: listener => {
        child.on('message', listener);
      },
      // A call takes as long as it takes; a child that dies fails its calls
      timeout: -1,
    }
  );

  child.on('error', error => rpc.$close(error));
  child.on('exit', (code, signal) =>
    rpc.$close(
      new Error(
        `The process running ${moduleURL} exited (${signal ?? `code ${code}`})`
      )
    )
  );

  return {
    rpc,

    /** Ends the process, and with it everything the module held. */
    async close() {
      // `kill` is false once the process is gone, or if it never started
      if (child.kill()) {
        await once(child, 'exit');
      }
    },
  };
}
