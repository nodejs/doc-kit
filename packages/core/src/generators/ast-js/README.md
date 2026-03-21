## `ast-js` Generator

The `ast-js` generator parses JavaScript source files into AST (Abstract Syntax Tree) representations using the Acorn parser.

### Configuring

The `ast-js` generator accepts the following configuration options:

| Name     | Type                 | Default | Description                                       |
| -------- | -------------------- | ------- | ------------------------------------------------- |
| `input`  | `string \| string[]` | -       | Glob pattern(s) for the JavaScript files to parse |
| `ignore` | `string \| string[]` | -       | Glob pattern(s) for files to exclude from parsing |
