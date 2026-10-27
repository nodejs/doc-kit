# Parsing JavaScript

The `ast-js` stage parses the `.js` files among your inputs into syntax trees
with [Acorn](https://github.com/acornjs/acorn), for generators that read source
code rather than Markdown. [API links](https://doc-kit.nodejs.org/generators/api-links)
is the built-in generator that reads it, and a
[generator of your own](https://doc-kit.nodejs.org/creating-generators) can
too.

**Stage:** `ast-js` · **Package:** [`@doc-kit/core`](https://doc-kit.nodejs.org/packages/core) · **Reads:** the `.js` files in `input` · **Writes:** no files

## Usage

You don't ask for `ast-js` yourself: it runs when a target depends on it, once
per run however many targets read it. Request `api-links`, from
[`@node-core/doc-kit`](https://doc-kit.nodejs.org/packages/node), and point
`--input` at your JavaScript:

```bash
npm install --save-dev @doc-kit/cli @node-core/doc-kit
npx doc-kit generate -t api-links -i "lib/*.js" -o out
```

## Configuring

`ast-js` has no options of its own. It reads these global options, which you
can also set in an `ast-js` section to apply to it alone:

- `input` {string|string[]} Glob patterns of the files to parse, relative to
  the working directory. Of the files they match, only those ending in `.js`
  are parsed; `.mjs`, `.cjs` and any other file is skipped. **Default:** from
  `global.input` (`--input`).
- `ignore` {string|string[]} Glob patterns of files to leave out.
  **Default:** from `global.ignore` (`--ignore`).

Files are parsed in worker threads,
[`chunkSize`](https://doc-kit.nodejs.org/configuration#execution-options) files
per task.

When the same run builds pages, keep `global.input` for your docs and give
`ast-js` its own: the [Markdown stage](https://doc-kit.nodejs.org/generators/ast)
parses every file `global.input` matches as Markdown, whatever its extension.

```js displayName="doc-kit.config.mjs"
export default {
  target: ['html', 'api-links'],
  global: {
    input: ['doc/api/*.md'],
    output: 'out',
  },
  'ast-js': {
    input: ['lib/*.js'],
    ignore: ['lib/*.test.js'],
  },
};
```

## How files are parsed

Acorn parses every file with the same options:

| Acorn option                 | Value                        | What it means for your files                                                                             |
| ---------------------------- | ---------------------------- | -------------------------------------------------------------------------------------------------------- |
| `ecmaVersion`                | `'latest'`                   | The newest syntax Acorn supports is accepted.                                                            |
| `sourceType`                 | `'script'` (Acorn's default) | Files are read as CommonJS-style scripts, so `import`, `export` and top-level `await` are syntax errors. |
| `allowReturnOutsideFunction` | `true`                       | A top-level `return` is allowed, as in a CommonJS module.                                                |
| `locations`                  | `true`                       | Every node has a `loc` holding its start and end as `line` (from 1) and `column` (from 0).               |

Acorn doesn't parse JSX or type annotations either. To document TypeScript
sources, see [Documenting TypeScript](https://doc-kit.nodejs.org/typescript).

> [!WARNING]
> A file that fails to parse stops the whole run with Acorn's syntax error,
> such as `'import' and 'export' may appear only with 'sourceType: module' (1:0)`.
> The message gives the line and column but not the file. ES modules are the
> usual cause: leave them out with `ignore`.

## What it produces

An array with one ESTree
[`Program`](https://github.com/estree/estree/blob/master/es5.md#programs) node
per file, as Acorn returns it, plus a `path` property: the file's path as the
glob matched it, such as `lib/fs.js`. Files are collected as their chunks
finish, so the array isn't in input order, and its order can change between
runs. Sort by `path` when your output needs to be stable.

A generator with `dependsOn: '@doc-kit/core/ast-js'` receives this array. This
one lists the top-level functions of each file, with the line each starts on:

```mjs displayName="functions.mjs"
import { join } from 'node:path';

import getConfig from '@doc-kit/core/utils/configuration/index.mjs';
import { writeJSON } from '@doc-kit/core/utils/file.mjs';

export default {
  name: 'functions',
  description: 'Lists the top-level functions of each JavaScript file',
  dependsOn: '@doc-kit/core/ast-js',

  async generate(programs) {
    const { output, minify } = getConfig('functions');

    const functions = programs
      .toSorted((a, b) => a.path.localeCompare(b.path))
      .flatMap(program =>
        program.body
          .filter(node => node.type === 'FunctionDeclaration')
          .map(node => ({
            name: node.id.name,
            file: program.path,
            line: node.loc.start.line,
          }))
      );

    if (output) {
      await writeJSON(join(output, 'functions.json'), functions, minify);
    }

    return functions;
  },
};
```

```bash
npx doc-kit generate -t ./functions.mjs -i "lib/**/*.js" -o out
```

[Creating generators](https://doc-kit.nodejs.org/creating-generators) covers
the rest of the generator API.
