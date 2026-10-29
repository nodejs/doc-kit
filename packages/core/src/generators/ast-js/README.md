# Parsing JavaScript

The `ast-js` stage parses the `.js` files among your inputs into syntax trees
with [Acorn](https://github.com/acornjs/acorn), for generators that read source
code rather than Markdown. [API links](https://doc-kit.nodejs.org/generators/api-links)
is the built-in generator that reads it, and a
[generator of your own](https://doc-kit.nodejs.org/creating-generators) can
too. You don't ask for `ast-js` yourself: it runs when a target depends on it,
once per run however many targets read it.

## Configuring

`ast-js` has no options of its own. It parses the files `input` matches, minus
those `ignore` matches (see
[Global options](https://doc-kit.nodejs.org/configuration#global-options)),
and of those only the ones ending in `.js`.

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

Files are parsed as scripts, so `import`, `export` and top-level `await` are
syntax errors, and a file that fails to parse stops the run. Leave ES modules
out with `ignore`. Acorn doesn't parse JSX or type annotations either; to
document TypeScript sources, see
[Documenting TypeScript](https://doc-kit.nodejs.org/typescript).

## What it produces

An array with one ESTree
[`Program`](https://github.com/estree/estree/blob/master/es5.md#programs) node
per file, as Acorn returns it with `locations` on, plus a `path` property: the
file's path as the glob matched it, such as `lib/fs.js`. Files are collected
as their chunks finish, so the array isn't in input order. A generator with
`dependsOn: '@doc-kit/core/ast-js'` receives this array.
