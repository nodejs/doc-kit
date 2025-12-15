import assert from 'node:assert/strict';
import process from 'node:process';
import { describe, it, mock } from 'node:test';

const CANCEL = Symbol('cancel');

const prompts = {
  intro: mock.fn(),
  outro: mock.fn(),
  cancel: mock.fn(),
  isCancel: v => v === CANCEL,
  select: mock.fn(async ({ message }) => {
    // first select is the command selector
    if (message === 'What would you like to do?') {
      return 0;
    }
    // subsequent selects are option prompts
    return 'a b';
  }),
  multiselect: mock.fn(async () => ['safe', 'has space', "has'quote"]),
  text: mock.fn(async ({ message, validate }) => {
    // Ensure optional label is propagated
    if (message.includes('(Optional)')) {
      return 'value with space';
    }

    // Ensure required validation is wired
    if (validate) {
      assert.equal(validate(''), 'Value is required!');
    }

    return 'ok';
  }),
  confirm: mock.fn(async ({ message }) => {
    // Do not execute the generated command
    if (message === 'Run now?') {
      return false;
    }

    // Option-level confirm should be false (boolean false branch)
    return false;
  }),
};

mock.module('@clack/prompts', {
  namedExports: prompts,
});

const spawnSync = mock.fn(() => ({ status: 0 }));
mock.module('node:child_process', {
  namedExports: { spawnSync },
});

const logger = {
  info: mock.fn(),
};
mock.module('../../../src/logger/index.mjs', {
  defaultExport: logger,
});

mock.module('../index.mjs', {
  defaultExport: [
    {
      name: 'custom',
      description: 'Custom command',
      options: {
        optionalText: {
          flags: ['--optional-text <value>'],
          desc: 'Optional text',
          prompt: { type: 'text', message: 'Optional text?' },
        },
        requiredText: {
          flags: ['--required-text <value>'],
          desc: 'Required text',
          prompt: { type: 'text', message: 'Required text?', required: true },
        },
        confirmFlag: {
          flags: ['--confirm-flag'],
          desc: 'Confirm flag',
          prompt: { type: 'confirm', message: 'Confirm?', initialValue: true },
        },
        pickOne: {
          flags: ['--pick-one <value>'],
          desc: 'Pick one',
          prompt: {
            type: 'select',
            message: 'Pick one?',
            options: [{ label: 'A', value: 'a b' }],
          },
        },
        multi: {
          flags: ['--multi <value>'],
          desc: 'Pick many',
          prompt: {
            type: 'multiselect',
            message: 'Pick many?',
            options: [{ label: 'safe', value: 'safe' }],
          },
        },
      },
      action: mock.fn(async () => {}),
    },
    {
      name: 'interactive',
      description: 'Self',
      options: {},
      action: async () => {},
    },
  ],
});

const cmd = (await import('../interactive.mjs')).default;

describe('bin/commands/interactive (extra branches)', () => {
  it('escapes args and handles optional/confirm/select/multiselect branches', async () => {
    await cmd.action();

    assert.equal(logger.info.mock.callCount(), 1);

    // Should not spawn when Run now? is false
    assert.equal(spawnSync.mock.callCount(), 0);

    const logged = logger.info.mock.calls[0].arguments[0];

    // Optional label should be applied
    assert.equal(prompts.text.mock.callCount() >= 2, true);

    // select + multiselect should include escaped values (spaces + quotes)
    assert.match(logged, /--pick-one\s+'a b'/);
    assert.match(logged, /--multi\s+safe/);
    assert.match(logged, /--multi\s+'has space'/);
    assert.match(logged, /--multi\s+'has'\\''quote'/);

    // confirmFlag was false so it should not appear
    assert.doesNotMatch(logged, /--confirm-flag/);
  });

  it('exits cleanly when cancelled during option prompts', async t => {
    const originalExit = process.exit;
    t.after(() => {
      process.exit = originalExit;
    });

    process.exit = code => {
      throw Object.assign(new Error('exit'), { code });
    };

    const cancelText = mock.fn(async () => CANCEL);
    prompts.text.mock.mockImplementation(cancelText);

    await assert.rejects(cmd.action(), err => {
      assert.equal(err.code, 0);
      return true;
    });

    assert.equal(prompts.cancel.mock.callCount() >= 1, true);
  });
});
