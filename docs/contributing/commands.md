# Adding a command

This page shows how to add a command to the `doc-kit` CLI
([`@doc-kit/cli`](../packages/cli.md), in `packages/cli`). Add one for a new
action. For a new output, write a [generator](../creating-generators.md)
instead: `doc-kit generate --target` already runs custom generators.

The CLI is built on [Commander](https://github.com/tj/commander.js). Each
command is a module in `packages/cli/bin/commands/` whose default export is a
Commander `Command`. `packages/cli/bin/cli.mjs` adds every command listed in
`packages/cli/bin/commands/index.mjs` to the program. The commands that exist
today are documented on the [CLI](../cli.md) page.

## Create the command

```js displayName="packages/cli/bin/commands/my-command.mjs"
import logger from '@doc-kit/core/logger/index.mjs';
import { Command, Option } from 'commander';

import { errorWrap } from '../utils.mjs';

export default new Command('my-command')
  .description('Does something useful')
  .addOption(new Option('-f, --force', 'Overwrite existing files'))
  .action(
    errorWrap(async opts => {
      logger.info(`Running with force: ${Boolean(opts.force)}`);
    })
  );
```

Wrap every action in `errorWrap` from `packages/cli/bin/utils.mjs`. It awaits
the action, logs anything it throws (synchronously or not) with the doc-kit
logger, and exits with code 1. To fail a command, throw an `Error`.

Log through the logger from `@doc-kit/core/logger/index.mjs` rather than
`console`. A `preAction` hook in `cli.mjs` sets its level from `--log-level`
before any command runs.

## Register it

Import the command in `packages/cli/bin/commands/index.mjs` and add it to the
exported array:

```js displayName="packages/cli/bin/commands/index.mjs"
import generate from './generate.mjs';
import myCommand from './my-command.mjs';
import preview from './preview.mjs';

export default [generate, preview, myCommand];
```

Nothing else needs to change. Commander builds the help text from the
command's description and options, so `doc-kit --help` lists the new command
and `doc-kit my-command --help` shows its options.

## Options and arguments

Define options with Commander's `Option` class, as `generate.mjs` does, and
positional arguments with `.argument()`. The action receives the positional
arguments first, then the parsed options, then the `Command` itself.

```js displayName="packages/cli/bin/commands/my-command.mjs"
export default new Command('my-command')
  .argument('<name>', 'What to act on')
  .addOption(new Option('-o, --output <directory>', 'The output directory'))
  .addOption(new Option('--count <number>', 'How many').argParser(Number))
  .addOption(
    new Option('--mode <mode>', 'How to run')
      .choices(['fast', 'safe'])
      .default('safe')
  )
  .action(
    errorWrap(async (name, opts) => {
      // opts.output, opts.count, opts.mode
    })
  );
```

| Syntax               | Meaning                                         |
| -------------------- | ----------------------------------------------- |
| `--flag`             | Boolean, `true` when present                    |
| `--name <value>`     | Takes a required value                          |
| `--name [value]`     | Takes an optional value                         |
| `--name <values...>` | Takes one or more values, collected in an array |

Values arrive as strings unless you add an `.argParser()`. Multi-word flags
are camelCased on the options object, so `--git-ref` becomes `opts.gitRef`.
See the [Commander options documentation](https://github.com/tj/commander.js#options)
for the full API.

`--log-level` is defined on the program, not on each command, so it works on
either side of the command name (`doc-kit --log-level debug my-command` or
`doc-kit my-command --log-level debug`). Don't add it to your command.

## Running generators from a command

A command that builds docs can follow what `generate` does:

```js displayName="packages/cli/bin/commands/my-command.mjs"
import createGenerator from '@doc-kit/core';
import {
  assertRunnableOptions,
  setConfig,
} from '@doc-kit/core/utils/configuration/index.mjs';
import { Command, Option } from 'commander';

import { errorWrap } from '../utils.mjs';

const { runGenerators } = createGenerator();

export default new Command('my-command')
  .description('Builds the docs, then does something useful')
  .addOption(new Option('--config-file <path>', 'Config file'))
  .addOption(
    new Option('-i, --input <patterns...>', 'Input file patterns (glob)')
  )
  .addOption(new Option('-t, --target <generator...>', 'Target generator(s)'))
  .action(
    errorWrap(async opts => {
      const config = await setConfig(opts);
      assertRunnableOptions(config);

      await runGenerators(config);
    })
  );
```

`setConfig` loads the
[configuration file](../configuration.md#where-configuration-lives)
(`opts.configFile`, or the first one it finds), merges in the command-line
options, and fills in the generators' defaults. `assertRunnableOptions` then
throws when no `target` or `input` is set.

`setConfig` reads options by the names `generate` gives them (`configFile`,
`input`, `target`, `output`, `gitRef`, and so on), so declare the flags your
command needs with the same names. A flag you don't declare can't be passed,
and its value comes only from the configuration file. To turn a new option
into configuration, map it in `createConfigFromCLIOptions`
(`packages/core/src/utils/configuration/index.mjs`).

## Before you open a pull request

- **Try it** from the repository root with
  `node --run run -- my-command --help`, which runs
  `node packages/cli/bin/cli.mjs`.
- **Keep the command thin.** `@doc-kit/cli` publishes only `bin/` (see
  `files` in `packages/cli/package.json`), and `node --run test` only picks up
  tests under `packages/*/src/` and `scripts/`, never `bin/`. Put logic worth
  testing in `@doc-kit/core`, with its tests in a `__tests__` directory next
  to it.
- **Document it** with a section on the [CLI page](../cli.md) (`docs/cli.md`),
  using the same option-list format as the existing commands, and in
  `packages/cli/README.md` if it changes how people use the package. If it
  adds a flag that sets configuration, also add the flag to the
  [CLI flags](../configuration.md#cli-flags) table.
- **Add a changeset** with `node --run changeset`, since `@doc-kit/cli` is
  published. See
  [Adding a changeset](https://github.com/nodejs/doc-kit/blob/main/CONTRIBUTING.md#adding-a-changeset).
