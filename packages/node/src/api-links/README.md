# API links

The `api-links` generator reads your JavaScript sources and writes
`apilinks.json`, which maps each exported API, such as `fs.readFile`, to the
line on GitHub that defines it. It's built for the Node.js `lib/` folder, and
works for any CommonJS codebase laid out the same way.

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
npx @doc-kit/cli generate -t api-links -i "lib/*.js" -o out
```

This writes `out/apilinks.json`. To build the Node.js docs, extend the
[Node.js preset](https://doc-kit.nodejs.org/packages/node#the-nodejs-preset)
instead, which sets `nodejs/node`.

The JavaScript is parsed by the
[Parsing JavaScript](https://doc-kit.nodejs.org/generators/ast-js) stage, which
explains which files it reads and how to keep them apart from your Markdown.
Links use the file's name without its directories, so match the files of a
single folder, as `lib/*.js` does.

## Configuring

- `sourceURL` {string} URL template for the file each link points into.
  `{fileName}` is the source file's name, such as `fs.js`, without its
  directories; the other placeholders take configuration values (see
  [templates](https://doc-kit.nodejs.org/configuration#generator-options)).
  Each link is the filled-in template followed by `#L` and a line number.
  **Default:** `'https://github.com/{repository}/blob/{ref}/lib/{fileName}'`.

It also reads the
[global options](https://doc-kit.nodejs.org/configuration#global-options)
`output`, `minify`, and `repository` and `ref`, which the default `sourceURL`
points into.

The default assumes the files live in `lib/` at the root of a GitHub
repository. For sources in `src/` on GitLab:

```js displayName="doc-kit.config.mjs"
export default {
  'api-links': {
    sourceURL: 'https://gitlab.com/{repository}/-/blob/{ref}/src/{fileName}',
  },
};
```

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
