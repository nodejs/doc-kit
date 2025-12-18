# Creating Commands

## Command Structure

Commands in `doc-kit` are defined as modules that export a command object conforming to the `Command` interface:

```typescript
interface Command {
  name: string;
  description: string;
  options: { [key: string]: Option };
  action: (options: any) => Promise<void>;
}
```

Each command consists of:

- **name**: The command name used in the CLI (e.g., `generate`, `interactive`)
- **description**: A short description shown in help text
- **options**: An object mapping option names to their definitions
- **action**: The async function that executes when the command is run

## Creating a New Command

### Step 1: Create the Command File

Create a new file in `bin/commands/` with your command name:

```javascript
// bin/commands/my-command.mjs
import logger from '../../src/logger/index.mjs';

/**
 * @type {import('./types').Command}
 */
export default {
  name: 'my-command',
  description: 'Does something useful',

  options: {
    // Define your options here (see next section)
  },

  async action(opts) {
    logger.info('Starting my-command', opts);

    // Your command logic here

    logger.info('Completed my-command');
  },
};
```

### Step 2: Register the Command

Add your command to the exports in `bin/commands/index.mjs`:

```javascript
import generate from './generate.mjs';
import interactive from './interactive.mjs';
import myCommand from './my-command.mjs';  // Add this

export default [
  generate,
  interactive,
  myCommand,  // Add this
];
```

### Step 3: Update CLI Entry Point

The CLI in `bin/cli.mjs` automatically loads commands from `bin/commands/index.mjs`, so no changes are needed there if you followed step 2.

## Command Options

Options define the flags and parameters your command accepts. Each option has:

```typescript
interface Option {
  flags: string[];           // CLI flags (e.g., ['-i', '--input <value>'])
  desc: string;             // Description for help text
  prompt?: PromptConfig;    // Interactive mode configuration
}
```

### Defining Options

```javascript
options: {
  input: {
    flags: ['-i', '--input <patterns...>'],
    desc: 'Input file patterns (glob)',
    prompt: {
      type: 'text',
      message: 'Enter input glob patterns',
      variadic: true,
      required: true,
    },
  },

  force: {
    flags: ['-f', '--force'],
    desc: 'Force overwrite existing files',
    prompt: {
      type: 'confirm',
      message: 'Overwrite existing files?',
      initialValue: false,
    },
  },

  mode: {
    flags: ['-m', '--mode <mode>'],
    desc: 'Operation mode',
    prompt: {
      type: 'select',
      message: 'Choose operation mode',
      options: [
        { label: 'Fast', value: 'fast' },
        { label: 'Thorough', value: 'thorough' },
      ],
    },
  },
}
```

### Flag Syntax

- `<value>` - Required argument
- `[value]` - Optional argument
- `<values...>` - Variadic (multiple values)
- `[values...]` - Optional variadic

### Option Types

#### `text`
Single-line text input.

```javascript
prompt: {
  type: 'text',
  message: 'Enter a value',
  initialValue: 'default',
  required: true,
}
```

#### `confirm`
Yes/no confirmation.

```javascript
prompt: {
  type: 'confirm',
  message: 'Are you sure?',
  initialValue: false,
}
```

#### `select`
Single choice from a list.

```javascript
prompt: {
  type: 'select',
  message: 'Choose one',
  options: [
    { label: 'Option 1', value: 'opt1' },
    { label: 'Option 2', value: 'opt2' },
  ],
}
```

#### `multiselect`
Multiple choices from a list.

```javascript
prompt: {
  type: 'multiselect',
  message: 'Choose multiple',
  options: [
    { label: 'Choice A', value: 'a' },
    { label: 'Choice B', value: 'b' },
  ],
}
```

## Interactive Prompts

The `interactive` command automatically uses the `prompt` configuration from your options. When users run:

```bash
doc-kit interactive
```

They'll be prompted to select a command, then guided through all required options.

### Prompt Configuration

- **message**: Question to ask the user
- **type**: Input type (`text`, `confirm`, `select`, `multiselect`)
- **required**: Whether the field must have a value
- **initialValue**: Default value
- **variadic**: Whether multiple values can be entered (for `text` type)
- **options**: Choices for `select`/`multiselect` types

### Making Options Interactive-Friendly

Always provide helpful messages and sensible defaults:

```javascript
threads: {
  flags: ['-p', '--threads <number>'],
  desc: 'Number of threads to use (minimum: 1)',
  prompt: {
    type: 'text',
    message: 'How many threads to allow',
    initialValue: String(cpus().length),  // Smart default
  },
},
```
