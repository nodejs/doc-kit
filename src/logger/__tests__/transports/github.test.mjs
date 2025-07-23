import { deepStrictEqual, strictEqual } from 'assert';
import { describe, it } from 'node:test';

import { LogLevel } from '../../constants.mjs';
import { github } from '../../transports/github.mjs';

describe('github', () => {
  it('should print debug messages', t => {
    t.mock.timers.enable({ apis: ['Date'] });

    const fn = t.mock.method(process.stdout, 'write');

    // noop
    fn.mock.mockImplementation(() => {});

    github({
      level: LogLevel.debug,
      message: 'Test message',
      timestamp: Date.now(),
    });

    const callsArgs = process.stdout.write.mock.calls.map(
      call => call.arguments[0]
    );

    strictEqual(process.stdout.write.mock.callCount(), 1);
    deepStrictEqual(callsArgs, [
      '::debug::[00:00:00.000] \x1B[34mDEBUG\x1B[39m: Test message\n',
    ]);
  });

  it('should print info messages', t => {
    t.mock.timers.enable({ apis: ['Date'] });
    const fn = t.mock.method(process.stdout, 'write');

    // noop
    fn.mock.mockImplementation(() => {});

    github({
      level: LogLevel.info,
      message: 'Test message',
      timestamp: Date.now(),
    });

    const callsArgs = process.stdout.write.mock.calls.map(
      call => call.arguments[0]
    );

    strictEqual(process.stdout.write.mock.callCount(), 1);
    deepStrictEqual(callsArgs, [
      '::notice ::[00:00:00.000] \x1B[32mINFO\x1B[39m: Test message\n',
    ]);
  });

  it('should print error messages ', t => {
    t.mock.timers.enable({ apis: ['Date'] });

    const fn = t.mock.method(process.stdout, 'write');

    // noop
    fn.mock.mockImplementation(() => {});

    github({
      level: LogLevel.error,
      message: 'Test message',
      timestamp: Date.now(),
    });

    const callsArgs = process.stdout.write.mock.calls.map(
      call => call.arguments[0]
    );

    strictEqual(process.stdout.write.mock.callCount(), 1);
    deepStrictEqual(callsArgs, [
      '::error ::[00:00:00.000] \x1B[35mERROR\x1B[39m: Test message\n',
    ]);
  });

  it('should print fatal messages', t => {
    t.mock.timers.enable({ apis: ['Date'] });

    const fn = t.mock.method(process.stdout, 'write');

    // noop
    fn.mock.mockImplementation(() => {});

    github({
      level: LogLevel.fatal,
      message: 'Test message',
      timestamp: Date.now(),
    });

    const callsArgs = process.stdout.write.mock.calls.map(
      call => call.arguments[0]
    );

    strictEqual(process.stdout.write.mock.callCount(), 1);
    deepStrictEqual(callsArgs, [
      '::error ::[00:00:00.000] \x1B[31mFATAL\x1B[39m: Test message\n',
    ]);
  });

  it('should print messages with file', t => {
    t.mock.timers.enable({ apis: ['Date'] });

    const fn = t.mock.method(process.stdout, 'write');

    // noop
    fn.mock.mockImplementation(() => {});

    github({
      level: LogLevel.info,
      message: 'Test message',
      metadata: {
        file: {
          path: 'test.md',
          position: {
            start: { line: 1 },
            end: { line: 1 },
          },
        },
      },
      timestamp: Date.now(),
    });

    const callsArgs = process.stdout.write.mock.calls.map(
      call => call.arguments[0]
    );

    strictEqual(process.stdout.write.mock.callCount(), 1);
    deepStrictEqual(callsArgs, [
      '::notice file=test.md,line=1,endLine=1::[00:00:00.000] \x1B[32mINFO\x1B[39m: Test message\n',
    ]);
  });

  it('should print child logger name', t => {
    t.mock.timers.enable({ apis: ['Date'] });
    const fn = t.mock.method(process.stdout, 'write');

    // noop
    fn.mock.mockImplementation(() => {});

    github({
      level: LogLevel.info,
      message: 'Test message',
      timestamp: Date.now(),
      module: 'child1',
    });

    const callsArgs = process.stdout.write.mock.calls.map(
      call => call.arguments[0]
    );

    strictEqual(process.stdout.write.mock.callCount(), 1);
    deepStrictEqual(callsArgs, [
      '::notice ::[00:00:00.000] \x1B[32mINFO\x1B[39m (child1): Test message\n',
    ]);
  });

  it('should print without colors if FORCE_COLOR = 0', t => {
    process.env.FORCE_COLOR = 0;

    t.mock.timers.enable({ apis: ['Date'] });

    const fn = t.mock.method(process.stdout, 'write');

    // noop
    fn.mock.mockImplementation(() => {});

    github({
      level: LogLevel.info,
      message: 'Test message',
      timestamp: Date.now(),
    });

    const callsArgs = process.stdout.write.mock.calls.map(
      call => call.arguments[0]
    );

    strictEqual(process.stdout.write.mock.callCount(), 1);
    deepStrictEqual(callsArgs, [
      '::notice ::[00:00:00.000] INFO: Test message\n',
    ]);
  });
});
