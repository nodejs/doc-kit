import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';

const logger = {
  setLogLevel: mock.fn(),
};

describe('bin/cli', () => {
  it('builds a program with commands/options and runs preAction hook', async () => {
    const action = mock.fn(async () => {});

    const commands = [
      {
        name: 'mycmd',
        description: 'My command',
        options: {
          requiredText: {
            flags: ['--required-text <value>'],
            desc: 'Required option',
            prompt: { type: 'text', required: true },
          },
          multi: {
            flags: ['--multi <values...>'],
            desc: 'Multi option',
            prompt: {
              type: 'multiselect',
              options: [{ value: 'a' }, { value: 'b' }],
              initialValue: ['a'],
            },
          },
        },
        action,
      },
    ];

    const { createProgram } = await import('../cli.mjs');
    const program = createProgram(commands, { loggerInstance: logger })
      .exitOverride()
      .configureOutput({
        writeOut: () => {},
        writeErr: () => {},
      });

    // Global option should be present
    const logLevelOpt = program.options.find(
      o => o.attributeName() === 'logLevel'
    );
    assert.ok(logLevelOpt);

    // Command and its options should be registered
    const mycmd = program.commands.find(c => c.name() === 'mycmd');
    assert.ok(mycmd);

    const requiredOpt = mycmd.options.find(
      o => o.attributeName() === 'requiredText'
    );
    assert.ok(requiredOpt);
    assert.equal(requiredOpt.mandatory, true);

    const multiOpt = mycmd.options.find(o => o.attributeName() === 'multi');
    assert.ok(multiOpt);
    assert.deepEqual(multiOpt.argChoices, ['a', 'b']);

    await program.parseAsync([
      'node',
      'cli',
      '--log-level',
      'debug',
      'mycmd',
      '--required-text',
      'hello',
      '--multi',
      'a',
    ]);

    assert.equal(logger.setLogLevel.mock.callCount(), 1);
    assert.equal(action.mock.callCount(), 1);
  });
});
