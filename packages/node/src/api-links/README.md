# API links

The `api-links` generator reads your JavaScript sources and writes
`apilinks.json`, which maps each exported API, such as `fs.readFile`, to the
line on GitHub that defines it. It's built for the Node.js `lib/` folder, and
works for any CommonJS codebase laid out the same way.

**Target:** `api-links` · **Package:** [`@node-core/doc-kit`](https://doc-kit.nodejs.org/packages/node) · **Reads:** [Parsing JavaScript](https://doc-kit.nodejs.org/generators/ast-js) · **Writes:** `apilinks.json`

> [!NOTE]
> The other doc-kit generators don't read `apilinks.json`, so load it from your
> own tooling. To link a page of the
> [website](https://doc-kit.nodejs.org/generators/html) to its source file, use
> the `source_link` directive instead (see
> [Page metadata](https://doc-kit.nodejs.org/writing-docs#page-metadata)).

## Usage

The links are GitHub URLs, so the generator needs your repository. There is
no flag for it, so set it in your
[configuration file](https://doc-kit.nodejs.org/configuration):

```js displayName="doc-kit.config.mjs"
export default {
  global: {
    repository: 'my-org/my-lib',
  },
};
```

```bash
npm install --save-dev @doc-kit/cli @node-core/doc-kit
npx doc-kit generate -t api-links -i "lib/*.js" -o out
```

This writes `out/apilinks.json`. Links point at `HEAD`; pass `--git-ref` to
link to a tag or commit, such as `--git-ref v24.0.0`. To build the Node.js
docs, extend the
[Node.js preset](https://doc-kit.nodejs.org/packages/node#the-nodejs-preset)
instead, which sets `nodejs/node`.

> [!IMPORTANT]
> Without a `repository`, every link keeps the literal `{repository}`
> placeholder, and nothing warns you about it.

## Configuring

Options go in the `api-links` section of the configuration file:

- `sourceURL` {string} URL template for the file each link points into. See
  [Source URLs](#source-urls). **Default:**
  `'https://github.com/{repository}/blob/{ref}/lib/{fileName}'`.
- `repository` {string} The GitHub repository, as `owner/name`.
  **Default:** from `global.repository`.
- `ref` {string} The Git branch, tag or commit the links point to.
  **Default:** `'HEAD'`, from `global.ref` (`--git-ref`).
- `output` {string} The directory to write `apilinks.json` to. Without one,
  nothing is written. **Default:** from `global.output` (`--output`).
- `minify` {boolean} Write the JSON on a single line instead of indented.
  **Default:** `false`, from `global.minify` (`--minify`).

### Source URLs

In `sourceURL`, `{fileName}` is the source file's name, such as `fs.js`,
without its directories. Other placeholders take configuration values, global
options included, such as `{repository}`, `{ref}` and `{version}`, and
`{name|fallback}` uses `fallback` when the option has no value. `{version}` has
no leading `v` (`24.0.0`), so write `v{version}` to point at a release tag.
Each link is the filled-in template followed by `#L` and a line number.

The default assumes the files live in `lib/` at the root of a GitHub
repository. For sources in `src/` on GitLab:

```js displayName="doc-kit.config.mjs"
export default {
  'api-links': {
    sourceURL: 'https://gitlab.com/{repository}/-/blob/{ref}/src/{fileName}',
  },
};
```

## Input

The [Parsing JavaScript](https://doc-kit.nodejs.org/generators/ast-js) stage
reads the files `input` matches and parses them with Acorn:

- Only files ending in `.js` are read. Other matches, `.cjs` and `.mjs`
  included, are skipped.
- Files are parsed as CommonJS scripts. A file that uses `import` or `export`
  stops the run with a syntax error.
- Links use the file's name without its directories, so match the files of a
  single folder, as `lib/*.js` does. With `lib/**/*.js`,
  `lib/internal/util.js` would link to `lib/util.js`, and files with the same
  name would overwrite each other's keys.

When the same run builds the website or other Markdown targets, give the
JavaScript to `ast-js` through its own `input`, and keep `global.input` for
your docs (see
[Parsing JavaScript](https://doc-kit.nodejs.org/generators/ast-js#configuring)).

## Output

`apilinks.json` is one flat object for all the input files. Each key names an
API, and each value links to the line that defines it. For this file:

```js displayName="lib/fs.js"
'use strict';

function readFile() {}

class Stats {
  constructor() {}
  isFile() {}
}

function Dirent() {}

Dirent.prototype.isDirectory = function () {};
Dirent.from = function () {};

module.exports = {
  readFile,
  Stats,
  Dirent,
};
```

the generator writes:

```json displayName="out/apilinks.json"
{
  "fs.readFile": "https://github.com/my-org/my-lib/blob/HEAD/lib/fs.js#L3",
  "Stats": "https://github.com/my-org/my-lib/blob/HEAD/lib/fs.js#L5",
  "new Stats": "https://github.com/my-org/my-lib/blob/HEAD/lib/fs.js#L6",
  "stats.isFile": "https://github.com/my-org/my-lib/blob/HEAD/lib/fs.js#L7",
  "fs.Dirent": "https://github.com/my-org/my-lib/blob/HEAD/lib/fs.js#L10",
  "dirent.isDirectory": "https://github.com/my-org/my-lib/blob/HEAD/lib/fs.js#L12",
  "Dirent.from": "https://github.com/my-org/my-lib/blob/HEAD/lib/fs.js#L13"
}
```

### How keys are named

The generator first finds what each file exports, then where each export is
defined. With the file named `fs.js`:

| In the source                                                                                          | Key                  | Links to        |
| ------------------------------------------------------------------------------------------------------ | -------------------- | --------------- |
| `function readFile() {}`, exported as `module.exports = { readFile }` or `exports.readFile = readFile` | `fs.readFile`        | The function    |
| `exports.writeFile = function () {}`                                                                   | `fs.writeFile`       | The assignment  |
| `class Stats {}`, exported as `module.exports = { Stats }`                                             | `Stats`              | The class       |
| The class's `constructor()`                                                                            | `new Stats`          | The constructor |
| A method of the class, such as `isFile()`                                                              | `stats.isFile`       | The method      |
| `function Dirent() {}`, exported as `module.exports = { Dirent }`                                      | `fs.Dirent`          | The function    |
| `Dirent.prototype.isDirectory = function () {}`                                                        | `dirent.isDirectory` | The assignment  |
| `Dirent.from = function () {}`                                                                         | `Dirent.from`        | The assignment  |
| `const assert = module.exports = ok`                                                                   | `assert`             | The declaration |
| `assert.strictEqual = function () {}`                                                                  | `assert.strictEqual` | The assignment  |

- A class, and the members of a class or constructor function, are picked up
  for a capitalized name listed in `module.exports = { ... }`, for the class in
  `module.exports = new Agent()`, and for the variable in
  `const assert = module.exports = ok`. The last two work whatever the name's
  case.
- Prototype methods lowercase the whole name (`Dirent` becomes `dirent`), and
  the methods of a `class`, static ones included, lowercase only its first
  letter (`WASI` becomes `wASI`). `Buffer` prototype methods use `buf`
  instead, as in `buf.toString`, matching the Node.js docs.
- A function exported as `deprecate(fn, message)` in `module.exports = { ... }`
  counts as `fn`.
- In a file whose name starts with `_`, functions exported by name through
  `module.exports` (as `module.exports = { fn }` or `module.exports.fn = fn`)
  are left out as internal. Functions exported through `exports.fn = ...` are
  still linked.
- Other forms aren't linked, among them arrow functions
  (`exports.read = () => {}`), `module.exports.read = function () {}`, and
  classes exported as `module.exports.Agent = Agent` or
  `module.exports = Agent`.
