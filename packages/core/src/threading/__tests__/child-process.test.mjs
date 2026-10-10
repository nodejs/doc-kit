import { notStrictEqual, rejects, strictEqual } from 'node:assert';
import { describe, it } from 'node:test';

import createChildProcess from '../child-process.mjs';

const fixture = new URL('./fixtures/child-module.mjs', import.meta.url);

describe('createChildProcess', () => {
  it("calls the module's exports in a process of its own", async context => {
    const { rpc, close } = createChildProcess(fixture);
    context.after(close);

    const pid = await rpc.pid();

    strictEqual(typeof pid, 'number');
    notStrictEqual(pid, process.pid);
  });

  it("rejects with the module's error", async context => {
    const { rpc, close } = createChildProcess(fixture);
    context.after(close);

    await rejects(rpc.fail(), /Thrown in the child/);
  });

  it('fails the calls in flight when the process exits', async context => {
    const { rpc, close } = createChildProcess(fixture);
    context.after(close);

    await rejects(rpc.exit(), /child-module\.mjs exited \(code 3\)/);
  });

  it('ends the process on close, failing the calls in flight', async () => {
    const { rpc, close } = createChildProcess(fixture);

    // Still starting: it cannot have answered yet
    const call = rpc.pid();

    await close();

    await rejects(call, /exited \(SIGTERM\)/);

    // Once the process is gone, closing again does nothing
    await close();
  });
});
