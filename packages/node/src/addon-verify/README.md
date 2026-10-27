# Addon examples

The `addon-verify` generator pulls the C++ addon examples out of an addons
document, such as Node.js's `doc/api/addons.md`, and writes each one to its own
folder with a `binding.gyp`, so a test suite can compile and run the examples
your docs show.

**Target:** `addon-verify` · **Package:** [`@node-core/doc-kit`](https://doc-kit.nodejs.org/packages/node) · **Reads:** [API entries](https://doc-kit.nodejs.org/generators/metadata) · **Writes:** a folder per example, such as `02_function_arguments/`

## Usage

From the root of a Node.js checkout:

```bash
npm install --save-dev @doc-kit/cli @node-core/doc-kit
npx doc-kit generate -t addon-verify -i doc/api/addons.md -o test/addons
```

This writes one folder per example to `test/addons/`. Building and running
them is up to your test suite.

## Configuring

`addon-verify` has no options of its own. It reads this global option, which
you can also set in an `addon-verify` section to apply to it alone:

- `output` {string} The directory to write the example folders to. Without
  one, nothing is written. **Default:** from `global.output` (`--output`).

## Marking up an example

Each heading's section, its content up to the next heading of any level, is a
possible example. In it, the generator picks the code blocks whose first line
is a `//` comment naming a `.cc`, `.h` or `.js` file:

````md displayName="doc/api/addons.md"
### Function arguments

```cpp
// addon.cc
#include <node.h>
```

```js
// test.js
const addon = require('./build/Release/addon');

console.log('This should be eight:', addon.add(3, 5));
```
````

- The first line must be `//`, one or more spaces, and the file name, with
  nothing after it. `//addon.cc`, `// addon.cc (C++)`, and `.cpp` or `.hpp`
  files are skipped without a warning.
- The comment sets the file name and stays in the written file. The code
  block's language doesn't matter.
- Code blocks without such a comment, like a `bash` block with build commands,
  are ignored.
- A section becomes an example only when it has at least one `.cc` file and
  one `.js` file.

> [!IMPORTANT]
> Keep all of an example's files under one heading. A code block under a
> nested heading belongs to that heading's section, so a `.js` file under a
> `### Building` subheading doesn't join the `.cc` file above it. Two headings
> with the same text, on the other hand, share one folder with the files of
> both.

## Output layout

For Node.js's `doc/api/addons.md`, the run above writes:

```text
test/addons/
├── 01_worker_support/
│   ├── addon.cc
│   ├── binding.gyp
│   └── test.js
├── 02_function_arguments/
│   ├── addon.cc
│   ├── binding.gyp
│   └── test.js
├── …
└── 08_passing_wrapped_objects_around/
    ├── addon.cc
    ├── binding.gyp
    ├── myobject.cc
    ├── myobject.h
    └── test.js
```

Each folder is named after its heading: a two-digit number, counting from `01`
the sections that became examples in the order they appear, then the heading
in lowercase, with spaces turned into underscores and other punctuation
removed. "Wrapping C++ objects" becomes `06_wrapping_c_objects`.

Every file is written as its code block holds it, except `test.js`, which is
prepared for Node.js's test suite: two lines are added at the top, and the
first `'./build/Release/addon'` is replaced with a path built from
`common.buildType`, so the test finds the addon in Debug builds too:

```js displayName="test/addons/02_function_arguments/test.js"
'use strict';
const common = require('../../common');
// test.js
const addon = require(`./build/${common.buildType}/addon`);

console.log('This should be eight:', addon.add(3, 5));
```

> [!WARNING]
> The generator also changes the indentation and escapes of `test.js`. It
> removes the smallest indentation it finds, up to four spaces, from every
> indented line, so nested code shifts left and the added lines can end up
> indented. Escape sequences turn into the characters they stand for: a `\n`
> inside a quoted string becomes a real line break, which is a syntax error.
> Check the written `test.js` when your example has nested blocks or escapes.

Next to the files, the generator writes a `binding.gyp`, on a single line,
with one target named `addon` that lists every file of the example as a
source, in order, and includes `../common.gypi`. Indented:

```json displayName="test/addons/02_function_arguments/binding.gyp"
{
  "targets": [
    {
      "target_name": "addon",
      "sources": ["addon.cc", "test.js"],
      "includes": ["../common.gypi"]
    }
  ]
}
```

`../../common` and `../common.gypi` resolve to `test/common` and
`test/addons/common.gypi` when the output is `test/addons` in a Node.js
checkout. To use the examples anywhere else, put a `common.gypi` in the output
directory, and a `common` module that exports `buildType` (such as
`'Release'`) in its parent.

> [!NOTE]
> The generator doesn't remove folders from earlier runs. When an example is
> removed, renamed or moved, delete the old numbered folders before you
> regenerate, for example with `rm -rf test/addons/??_*/`.
