import type { BirpcReturn } from 'birpc';

// A module running in a child process of its own (see `createChildProcess`).
// Extend it with the module's methods, calling them through `rpc`.
export interface ChildProcess<T> {
  // Calls the module's exports. Calls in flight fail once the process exits.
  rpc: BirpcReturn<T>;
  // Ends the process, and with it everything the module held.
  close(): Promise<void>;
}
