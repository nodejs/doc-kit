import assert from 'node:assert/strict';
import process from 'node:process';
import { beforeEach, describe, it, mock } from 'node:test';

let selectCalls = 0;

const prompts = {
  intro: mock.fn(),
  outro: mock.fn(),
  cancel: mock.fn(),
  isCancel: v => v === 'CANCEL',
  select: mock.fn(async () => {
    // 1st: command selection -> pick first command (generate)
    // 2nd+ (if any): select prompts within options
    selectCalls += 1;
    return selectCalls === 1 ? 0 : 'value';
  }),
  multiselect: mock.fn(async () => ['web']),
  text: mock.fn(async ({ validate }) => {
    // Only satisfy required fields.
    if (validate) {
      return "doc/api/foo'bar.md";
    }
    return ''; // skip optionals
  }),
  confirm: mock.fn(async ({ message }) => {
    // Don't execute spawned command by default
    return message !== 'Run now?';
  }),
};

mock.module('@clack/prompts', {
  namedExports: prompts,
});

const logger = {
  info: mock.fn(),
  debug: mock.fn(),
  error: mock.fn(),
  child: () => logger,
};

mock.module('../../../src/logger/index.mjs', {
  defaultExport: logger,
});

const spawnSync = mock.fn(() => ({ status: 0 }));

mock.module('node:child_process', {
  namedExports: { spawnSync },
});

const cmd = (await import('../interactive.mjs')).default;

beforeEach(() => {
  selectCalls = 0;

  prompts.intro.mock.resetCalls();
  prompts.outro.mock.resetCalls();
  prompts.cancel.mock.resetCalls();
  prompts.select.mock.resetCalls();
  prompts.multiselect.mock.resetCalls();
  prompts.text.mock.resetCalls();
  prompts.confirm.mock.resetCalls();

  logger.info.mock.resetCalls();
  spawnSync.mock.resetCalls();

  prompts.select.mock.mockImplementation(async () => {
    selectCalls += 1;
    return selectCalls === 1 ? 0 : 'value';
  });

  prompts.text.mock.mockImplementation(async ({ validate }) => {
    if (validate) {
      return "doc/api/foo'bar.md";
    }
    return '';
  });

  prompts.multiselect.mock.mockImplementation(async () => ['web']);

  prompts.confirm.mock.mockImplementation(async ({ message }) => {
    return message !== 'Run now?';
  });
});

describe('bin/commands/interactive', () => {
  it('builds a command and does not execute when Run now? is false', async () => {
    await cmd.action();

    assert.equal(logger.info.mock.callCount(), 1);
    const msg = logger.info.mock.calls[0].arguments[0];
    assert.ok(msg.includes('Generated command'));

    // Ensure shell escaping happened for the single-quote.
    assert.ok(msg.includes("'doc/api/foo'\\''bar.md'"));

    assert.equal(spawnSync.mock.callCount(), 0);
    assert.equal(prompts.outro.mock.callCount(), 1);
  });

  it('executes the generated command when confirmed', async () => {
    prompts.confirm.mock.mockImplementation(async ({ message }) => {
      if (message === 'Run now?') {
        return true;
      }
      return true;
    });

    await cmd.action();

    assert.equal(spawnSync.mock.callCount(), 1);
    const [execPath, args, opts] = spawnSync.mock.calls[0].arguments;
    assert.equal(execPath, process.execPath);
    assert.ok(Array.isArray(args));
    assert.equal(opts.stdio, 'inherit');
  });

  it('exits with code 0 on cancellation at the first prompt', async t => {
    const exit = t.mock.method(process, 'exit');
    exit.mock.mockImplementation(code => {
      const err = new Error('process.exit');
      // attach code for debugging if needed
      err.code = code;
      throw err;
    });

    prompts.select.mock.mockImplementationOnce(async () => 'CANCEL');

    try {
      await cmd.action();
    } catch {
      // expected: process.exit terminates execution in real CLI
    }

    assert.equal(prompts.cancel.mock.callCount() >= 1, true);
    assert.equal(exit.mock.callCount(), 1);
    assert.equal(exit.mock.calls[0].arguments[0], 0);
  });
});
