# Creating Commands

The `doc-kit` CLI is built on [Commander](https://www.npmjs.com/package/commander).
Each command is a module in `packages/cli/bin/commands/` whose default export
is a Commander `Command` instance; the CLI entry point registers every command
exported from `packages/cli/bin/commands/index.mjs`.

Today the CLI ships a single command, [`generate`](../cli.md).

## Creating a New Command

### Step 1: Create the Command File

Create a new file in `packages/cli/bin/commands/` with your command name:

```mjs displayName="packages/cli/bin/commands/my-command.mjs"
import { Command, Option } from 'commander';

import { errorWrap } from '../utils.mjs';

export default new Command('my-command')
  .description('Does something useful')
  .addOption(new Option('-f, --force', 'Force overwrite existing files'))
  .action(
    errorWrap(async opts => {
      // Your command logic here
    })
  );
```

`errorWrap` catches both synchronous and asynchronous errors, logs them, and
exits with a non-zero status — wrap every action with it so failures are
reported consistently.

### Step 2: Register the Command

Add your command to the exports in `packages/cli/bin/commands/index.mjs`:

```mjs displayName="packages/cli/bin/commands/index.mjs"
import generate from './generate.mjs';
import myCommand from './my-command.mjs'; // Add this

export default [
  generate,
  myCommand, // Add this
];
```

The CLI in `packages/cli/bin/cli.mjs` registers every command in that array,
so no further changes are needed.

## Command Options

Options use Commander's `Option` class directly; see the [Commander
documentation](https://www.npmjs.com/package/commander#options) for the full
API.

```js
.addOption(new Option('-i, --input <patterns...>', 'Input file patterns (glob)'))
.addOption(new Option('-o, --output <directory>', 'The output directory'))
.addOption(
  new Option('--log-level <level>', 'Log level').choices(['debug', 'info'])
)
```

### Flag Syntax

- `<value>` - Required argument
- `[value]` - Optional argument
- `<values...>` - Variadic (multiple values)
- `[values...]` - Optional variadic

One global option, `--log-level`, is defined on the program itself in
`packages/cli/bin/cli.mjs` and applies to every command.
