import { createBirpc } from 'birpc';

// What `createChildProcess` runs in the child: it answers the parent's calls to
// the given module's exports until the parent ends it. Node holds the parent's
// messages until the listener below is added, so none are lost to the import.
const functions = await import(process.argv[2]);

createBirpc(
  { ...functions },
  {
    /** @param {unknown} message */
    post: message => process.send(message),
    /** @param {(message: unknown) => void} listener */
    on: listener => {
      process.on('message', listener);
    },
    timeout: -1,
  }
);
