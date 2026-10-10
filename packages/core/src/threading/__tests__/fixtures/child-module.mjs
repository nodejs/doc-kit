// A module for `createChildProcess` to run (see `../child-process.test.mjs`)

/** @returns {number} The ID of the process it runs in */
export const pid = () => process.pid;

/** Throws, for the error to reach the parent */
export const fail = () => {
  throw new Error('Thrown in the child');
};

/** Ends the process before it can answer */
export const exit = () => process.exit(3);
